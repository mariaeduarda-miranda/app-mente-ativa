const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'mente-ativa-jwt-super-secret-key-2026';

function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: 'Acesso negado. Token de autorização não fornecido.',
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      error: 'Formato de token inválido. Utilize o padrão: Bearer <token>',
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    console.error('Erro na verificação do token JWT:', error.message);
    return res.status(403).json({
      error: 'Token inválido ou expirado. Por favor, realize o login novamente.',
    });
  }
}

module.exports = {
  authenticateJWT,
  JWT_SECRET,
};
