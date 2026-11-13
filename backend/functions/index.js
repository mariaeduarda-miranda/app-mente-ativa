const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const authController = require('./src/authController');

// Inicializa o Firebase Admin SDK (se ainda não estiver inicializado)
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * HTTPS Cloud Function: login
 * Rota pública para autenticação de usuários do app 'Mente Ativa'
 *
 * Recebe no body: { email, password }
 * Retorna: { token: "SEU_JWT_TOKEN", user: { uid, email } }
 */
exports.login = functions.https.onRequest((req, res) => {
  // Executa o middleware CORS para permitir requisições de clientes mobile e web
  return cors(req, res, () => {
    return authController.login(req, res);
  });
});

/**
 * HTTPS Cloud Function: verifyToken
 * Rota para verificação e validação da integridade do Token JWT
 */
exports.verifyToken = functions.https.onRequest((req, res) => {
  return cors(req, res, () => {
    return authController.verifyToken(req, res);
  });
});
