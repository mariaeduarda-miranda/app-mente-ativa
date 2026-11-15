const express = require('express');
const cors = require('cors');
const config = require('./config');
const { pool } = require('./db');
const authController = require('./authController');
const avatarController = require('./avatarController');
const progressController = require('./progressController');
const { authenticateJWT } = require('./authMiddleware');
const { rateLimit } = require('./rateLimit');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(
  cors({
    origin:
      config.corsOrigin === '*'
        ? true
        : config.corsOrigin
            .split(',')
            .map((origin) => origin.trim())
            .filter(Boolean),
  })
);
app.use(express.json({ limit: '100kb' }));

// Fotos de perfil: servidas como estaticas com cache imutavel. Cada troca de
// imagem gera um nome novo, entao o cache do celular nunca fica desatualizado.
app.use(
  '/uploads',
  express.static(config.uploadsDir, {
    maxAge: '365d',
    immutable: true,
    index: false,
    fallthrough: true,
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  })
);

// --- Raiz: lista as rotas disponiveis --------------------------------------
// Sem isso, abrir http://localhost:3000 no navegador devolvia 404, o que
// confundia quem estava testando a API.
app.get('/', (req, res) => {
  return res.status(200).json({
    name: 'Mente Ativa API',
    status: 'ok',
    version: '1.0.0',
    docs: 'Todas as rotas de escrita exigem JSON e retornam JSON.',
    endpoints: [
      { method: 'GET', path: '/health', description: 'Status da API e do banco' },
      { method: 'POST', path: '/register', description: 'Cria conta { name, email, password }' },
      { method: 'POST', path: '/login', description: 'Autentica { email, password }' },
      { method: 'GET', path: '/me', description: 'Dados do usuario (Bearer token)' },
      { method: 'PUT', path: '/me', description: 'Atualiza nome/e-mail (Bearer token)' },
      { method: 'PUT', path: '/me/password', description: 'Troca a senha (Bearer token)' },
      { method: 'PUT', path: '/me/avatar', description: 'Envia foto de perfil (multipart)' },
      { method: 'DELETE', path: '/me/avatar', description: 'Remove a foto de perfil' },
      { method: 'POST', path: '/progress/sessions', description: 'Grava uma sessao de jogo' },
      { method: 'GET', path: '/progress', description: 'Resumo do progresso do usuario' },
      { method: 'POST', path: '/verifyToken', description: 'Valida um token JWT' },
    ],
  });
});

// --- Healthcheck (usado pelo smoke test e para diagnostico) -----------------
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.status(200).json({
      ok: true,
      db: true,
      uptimeSeconds: Math.round(process.uptime()),
    });
  } catch (error) {
    return res.status(503).json({ ok: false, db: false });
  }
});

// --- Rotas de autenticacao --------------------------------------------------
app.post(
  '/register',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }),
  authController.register
);
app.post(
  '/login',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }),
  authController.login
);
app.post('/verifyToken', authController.verifyToken);
app.get('/me', authenticateJWT, authController.me);
app.put('/me', authenticateJWT, authController.updateProfile);
app.put(
  '/me/password',
  authenticateJWT,
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }),
  authController.changePassword
);

// --- Foto de perfil ---------------------------------------------------------
// Diagnostico: registra cada tentativa de upload no terminal da API. Ajuda a
// distinguir "a requisicao nunca chegou" de "chegou e foi recusada".
app.use('/me/avatar', (req, res, next) => {
  const startedAt = Date.now();
  const bytes = Number(req.headers['content-length'] || 0);
  const size = bytes ? `${Math.round(bytes / 1024)} KB` : 'tamanho desconhecido';

  console.log(
    `[avatar] ${req.method} iniciado por ${req.ip} (${size}, ${
      req.headers['content-type'] || 'sem content-type'
    })`
  );

  req.on('aborted', () => {
    console.warn('[avatar] Cliente abortou o envio antes do fim.');
  });

  res.on('finish', () => {
    console.log(
      `[avatar] ${req.method} -> ${res.statusCode} em ${Date.now() - startedAt} ms`
    );
  });

  res.on('close', () => {
    if (!res.writableEnded) {
      console.warn(
        `[avatar] Conexao encerrada antes da resposta (${Date.now() - startedAt} ms).`
      );
    }
  });

  next();
});

app.put(
  '/me/avatar',
  authenticateJWT,
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }),
  avatarController.uploadAvatarImage,
  avatarController.updateAvatar
);
app.delete(
  '/me/avatar',
  authenticateJWT,
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }),
  avatarController.removeAvatar
);

// --- Progresso dos jogos ----------------------------------------------------
app.post('/progress/sessions', authenticateJWT, progressController.createSession);
app.get('/progress', authenticateJWT, progressController.summary);

// --- 404 (rota inexistente) e 405 (metodo errado) ---------------------------
// Ajuda quem testa a API pelo navegador: abrir /login no navegador faz um GET,
// mas a rota so aceita POST. Antes isso retornava "Rota nao encontrada".
const KNOWN_ROUTES = {
  '/': ['GET'],
  '/health': ['GET'],
  '/register': ['POST'],
  '/login': ['POST'],
  '/verifyToken': ['POST'],
  '/me': ['GET', 'PUT'],
  '/me/password': ['PUT'],
  '/me/avatar': ['PUT', 'DELETE'],
  '/progress': ['GET'],
  '/progress/sessions': ['POST'],
};

app.use((req, res) => {
  const path = req.path.replace(/\/+$/, '') || '/';
  const allowed = KNOWN_ROUTES[path];

  if (allowed) {
    res.set('Allow', allowed.join(', '));
    return res.status(405).json({
      error:
        `O metodo ${req.method} nao e aceito em ${req.path}. ` +
        `Use: ${allowed.join(' ou ')}.`,
    });
  }

  return res.status(404).json({
    error: `Rota nao encontrada: ${req.method} ${req.path}.`,
    hint: 'Abra GET / no navegador para ver a lista de rotas.',
  });
});

app.use((error, req, res, next) => {
  if (error?.name === 'MulterError') {
    console.warn(`[avatar] Upload recusado: ${error.code} (${error.message}).`);

    if (error.code === 'LIMIT_FILE_SIZE') {
      const maxMb = Math.round((config.avatarMaxBytes / 1024 / 1024) * 10) / 10;
      return res.status(413).json({
        error: `A imagem deve ter no máximo ${maxMb} MB.`,
      });
    }

    return res.status(400).json({ error: 'Não foi possível receber a imagem enviada.' });
  }

  if (error?.status >= 400 && error.status < 500) {
    return res.status(error.status).json({ error: error.message });
  }

  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Corpo da requisição não é um JSON válido.' });
  }

  if (error?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Corpo da requisição muito grande.' });
  }

  console.error('[api] Erro nao tratado:', error);
  return res.status(500).json({ error: 'Erro interno ao processar a requisição.' });
});

module.exports = app;
