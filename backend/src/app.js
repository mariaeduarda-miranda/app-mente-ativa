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

// --- 404 e tratamento centralizado de erros --------------------------------
app.use((req, res) => {
  return res.status(404).json({ error: 'Rota não encontrada.' });
});

app.use((error, req, res, next) => {
  if (error?.name === 'MulterError') {
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
