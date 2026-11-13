const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('./config');
const { query } = require('./db');
const { normalizeEmail, validateRegistration, validateLogin } = require('./validators');

/**
 * Hash "descartavel" usado para igualar o tempo de resposta quando o e-mail
 * nao existe, dificultando ataques de enumeracao de usuarios por timing.
 */
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('dummy-password-for-timing', 10);

function buildToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
    },
    config.jwtSecret,
    {
      expiresIn: config.jwtExpiresIn,
      issuer: config.jwtIssuer,
    }
  );
}

/**
 * Formato publico do usuario. `uid` e mantido como alias de `id` para
 * compatibilidade com a versao anterior do app mobile.
 */
function toPublicUser(row) {
  return {
    id: row.id,
    uid: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.created_at,
  };
}

/**
 * Gera a sessao (token + usuario) a partir de uma linha da tabela users.
 */
function buildSession(row) {
  return {
    token: buildToken(row),
    expiresIn: config.jwtExpiresIn,
    user: toPublicUser(row),
  };
}

/**
 * POST /register
 * Cria uma conta nova. Nunca cria conta durante o login.
 */
async function register(req, res) {
  const { name, email, password } = req.body || {};

  const errors = validateRegistration({ name, email, password });
  if (errors.length > 0) {
    return res.status(400).json({ error: errors[0], details: errors });
  }

  const passwordHash = await bcrypt.hash(password, config.bcryptRounds);

  // O INSERT + ON CONFLICT evita corrida entre duas requisicoes simultaneas
  // com o mesmo e-mail (o indice unico e em lower(email)).
  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (lower(email)) DO NOTHING
     RETURNING id, name, email, is_active, created_at, updated_at`,
    [String(name).trim(), normalizeEmail(email), passwordHash]
  );

  if (rows.length === 0) {
    return res.status(409).json({ error: 'Já existe uma conta com este e-mail.' });
  }

  return res.status(201).json(buildSession(rows[0]));
}

/**
 * POST /login
 * Apenas autentica uma conta existente. Qualquer falha de credencial
 * retorna a mesma mensagem generica (evita enumeracao de e-mails).
 */
async function login(req, res) {
  const { email, password } = req.body || {};

  const errors = validateLogin({ email, password });
  if (errors.length > 0) {
    return res.status(400).json({ error: errors[0], details: errors });
  }

  const { rows } = await query(
    `SELECT id, name, email, password_hash, is_active, created_at, updated_at
       FROM users
      WHERE lower(email) = lower($1)
      LIMIT 1`,
    [normalizeEmail(email)]
  );

  const user = rows[0];
  const passwordMatches = await bcrypt.compare(
    String(password),
    user ? user.password_hash : DUMMY_PASSWORD_HASH
  );

  if (!user || !passwordMatches) {
    return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
  }

  if (!user.is_active) {
    return res.status(403).json({ error: 'Esta conta está desativada.' });
  }

  return res.status(200).json(buildSession(user));
}

/**
 * GET /me (protegido por authenticateJWT)
 * Revalida o usuario no banco a cada chamada, garantindo que contas
 * desativadas ou removidas percam o acesso imediatamente.
 */
async function me(req, res) {
  const { rows } = await query(
    `SELECT id, name, email, is_active, created_at, updated_at
       FROM users
      WHERE id = $1
      LIMIT 1`,
    [req.user.id]
  );

  const user = rows[0];
  if (!user || !user.is_active) {
    return res.status(401).json({ error: 'Sessão inválida. Faça login novamente.' });
  }

  return res.status(200).json({ user: toPublicUser(user) });
}

/**
 * POST /verifyToken (e equivalente ao GET /me)
 * Mantido para compatibilidade com a versao anterior do app mobile.
 */
async function verifyToken(req, res) {
  let token = null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice('Bearer '.length).trim();
  } else if (req.body && typeof req.body.token === 'string') {
    token = req.body.token.trim();
  }

  if (!token) {
    return res.status(401).json({ valid: false, error: 'Nenhum token JWT foi fornecido.' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret, { issuer: config.jwtIssuer });
    const { rows } = await query(
      `SELECT id, name, email, is_active, created_at, updated_at
         FROM users
        WHERE id = $1
        LIMIT 1`,
      [decoded.sub]
    );

    const user = rows[0];
    if (!user || !user.is_active) {
      return res.status(401).json({ valid: false, error: 'Sessão inválida.' });
    }

    return res.status(200).json({ valid: true, user: toPublicUser(user) });
  } catch (error) {
    return res.status(401).json({ valid: false, error: 'Token JWT inválido ou expirado.' });
  }
}

module.exports = {
  register,
  login,
  me,
  verifyToken,
  // Exportados para testes/reuso.
  buildSession,
  toPublicUser,
};
