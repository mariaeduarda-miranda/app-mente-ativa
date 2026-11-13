const path = require('path');

// Carrega o .env da raiz do backend, independente do diretorio de execucao.
require('dotenv').config({
  path: path.resolve(__dirname, '..', '.env'),
  quiet: true,
});

/**
 * Configuracao central da API.
 * Falha rapido (fail fast) quando algo essencial esta ausente ou invalido,
 * em vez de usar segredos padrao no codigo.
 */
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
  seed: {
    name: process.env.SEED_USER_NAME || 'Usuario Teste',
    email: process.env.SEED_USER_EMAIL || 'teste@menteativa.com',
    password: process.env.SEED_USER_PASSWORD || 'Senha@123',
  },
};

module.exports = config;
