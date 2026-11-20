const path = require('path');

require('dotenv').config({
  path: path.resolve(__dirname, '..', '.env'),
  quiet: true,
});

function required(name, { minLength = 1 } = {}) {
  const value = (process.env[name] || '').trim();
  if (!value) {
    throw new Error(
      `Variavel de ambiente ${name} nao definida. Copie backend/.env.example para backend/.env.`
    );
  }
  if (value.length < minLength) {
    throw new Error(
      `Variavel de ambiente ${name} invalida: minimo de ${minLength} caracteres.`
    );
  }
  return value;
}

const config = {
  isProduction: process.env.NODE_ENV === 'production',
  port: Number.parseInt(process.env.PORT || '3000', 10),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET', { minLength: 32 }),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtIssuer: 'mente-ativa-api',
  corsOrigin: (process.env.CORS_ORIGIN || '*').trim(),
  bcryptRounds: Number.parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  uploadsDir: path.resolve(__dirname, '..', process.env.UPLOADS_DIR || 'uploads'),
  avatarMaxBytes: Number.parseInt(process.env.AVATAR_MAX_BYTES || '5242880', 10),
  avatarDimension: Number.parseInt(process.env.AVATAR_DIMENSION || '512', 10),
  avatarQuality: Number.parseInt(process.env.AVATAR_QUALITY || '82', 10),
  seed: {
    name: process.env.SEED_USER_NAME || 'Usuario Teste',
    email: process.env.SEED_USER_EMAIL || 'teste@menteativa.com',
    password: process.env.SEED_USER_PASSWORD || 'Senha@123',
  },
};

module.exports = config;
