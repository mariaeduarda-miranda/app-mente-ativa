const jwt = require('jsonwebtoken');
const config = require('./config');

function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token de autorização não fornecido.' });
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Formato inválido. Use: Bearer <token>.' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret, { issuer: config.jwtIssuer });
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      name: decoded.name,
    };
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido ou expirado. Faça login novamente.' });
  }
}

module.exports = { authenticateJWT };
