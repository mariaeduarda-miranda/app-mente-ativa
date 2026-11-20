const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('./config');
const { query } = require('./db');
const { normalizeEmail, validateRegistration, validateLogin, validatePassword, validateProfileUpdate } = require('./validators');

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

function toPublicUser(row) {
  return {
    id: row.id,
    uid: row.id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatar_path ? `/uploads/${row.avatar_path}` : null,
    createdAt: row.created_at,
  };
}

function buildSession(row) {
  return {
    token: buildToken(row),
    expiresIn: config.jwtExpiresIn,
    user: toPublicUser(row),
  };
}

async function recordLoginAttempt({ req, user, email, success, reason }) {
  try {
    await query(
      `INSERT INTO login_events (user_id, email, success, reason, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        user?.id || null,
        normalizeEmail(email),
        success,
        reason || null,
        (req.ip || '').slice(0, 64) || null,
        (req.get('user-agent') || '').slice(0, 255) || null,
      ]
    );
  } catch (error) {
    console.warn('[auth] Nao foi possivel registrar o login:', error.message);
  }
}

async function register(req, res) {
  const { name, email, password } = req.body || {};

  const errors = validateRegistration({ name, email, password });
  if (errors.length > 0) {
    return res.status(400).json({ error: errors[0], details: errors });
  }

  const passwordHash = await bcrypt.hash(password, config.bcryptRounds);

  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (lower(email)) DO NOTHING
     RETURNING id, name, email, is_active, avatar_path, created_at, updated_at`,
    [String(name).trim(), normalizeEmail(email), passwordHash]
  );

  if (rows.length === 0) {
    return res.status(409).json({ error: 'Já existe uma conta com este e-mail.' });
  }

  return res.status(201).json(buildSession(rows[0]));
}

async function login(req, res) {
  const { email, password } = req.body || {};

  const errors = validateLogin({ email, password });
  if (errors.length > 0) {
    return res.status(400).json({ error: errors[0], details: errors });
  }

  const { rows } = await query(
    `SELECT id, name, email, password_hash, is_active, avatar_path, created_at, updated_at
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
    await recordLoginAttempt({
      req,
      user,
      email,
      success: false,
      reason: user ? 'senha_incorreta' : 'email_nao_encontrado',
    });

    return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
  }

  if (!user.is_active) {
    await recordLoginAttempt({
      req,
      user,
      email,
      success: false,
      reason: 'conta_desativada',
    });

    return res.status(403).json({ error: 'Esta conta está desativada.' });
  }

  await recordLoginAttempt({ req, user, email, success: true });

  return res.status(200).json(buildSession(user));
}

async function me(req, res) {
  const { rows } = await query(
    `SELECT id, name, email, is_active, avatar_path, created_at, updated_at
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

async function updateProfile(req, res) {
  const { name, email } = req.body || {};

  const errors = validateProfileUpdate({ name, email });
  if (errors.length > 0) {
    return res.status(400).json({ error: errors[0], details: errors });
  }

  const nextName = name === undefined ? null : String(name).trim();
  const nextEmail = email === undefined ? null : normalizeEmail(email);

  try {
    const { rows } = await query(
      `UPDATE users
          SET name = COALESCE($1, name),
              email = COALESCE($2, email)
        WHERE id = $3
        RETURNING id, name, email, is_active, avatar_path, created_at, updated_at`,
      [nextName, nextEmail, req.user.id]
    );

    const user = rows[0];
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Sessão inválida. Faça login novamente.' });
    }

    return res.status(200).json(buildSession(user));
  } catch (error) {
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'Já existe uma conta com este e-mail.' });
    }
    throw error;
  }
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body || {};

  if (!currentPassword) {
    return res.status(400).json({ error: 'Informe a senha atual.' });
  }

  const passwordError = validatePassword(newPassword, { isRegistration: true });
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  if (String(currentPassword) === String(newPassword)) {
    return res.status(400).json({ error: 'A nova senha deve ser diferente da atual.' });
  }

  const { rows } = await query(
    `SELECT password_hash, is_active
       FROM users
      WHERE id = $1
      LIMIT 1`,
    [req.user.id]
  );

  const user = rows[0];
  if (!user || !user.is_active) {
    return res.status(401).json({ error: 'Sessão inválida. Faça login novamente.' });
  }

  const passwordMatches = await bcrypt.compare(String(currentPassword), user.password_hash);
  if (!passwordMatches) {
    return res.status(401).json({ error: 'Senha atual incorreta.' });
  }

  const passwordHash = await bcrypt.hash(newPassword, config.bcryptRounds);
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [
    passwordHash,
    req.user.id,
  ]);

  return res.status(200).json({ message: 'Senha atualizada com sucesso.' });
}

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
      `SELECT id, name, email, is_active, avatar_path, created_at, updated_at
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
  updateProfile,
  changePassword,
  verifyToken,
  buildSession,
  toPublicUser,
};
