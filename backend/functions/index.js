const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const authController = require('./src/authController');

if (!admin.apps.length) {
  admin.initializeApp();
}

exports.login = functions.https.onRequest((req, res) => {
  return cors(req, res, () => {
    return authController.login(req, res);
  });
});

exports.verifyToken = functions.https.onRequest((req, res) => {
  return cors(req, res, () => {
    return authController.verifyToken(req, res);
  });
});
