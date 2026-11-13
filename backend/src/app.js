const express = require('express');
const cors = require('cors');
const config = require('./config');
const { pool } = require('./db');
const authController = require('./authController');
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

// --- 404 e tratamento centralizado de erros --------------------------------
app.use((req, res) => {
  return res.status(404).json({ error: 'Rota não encontrada.' });
});

app.use((error, req, res, next) => {
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
