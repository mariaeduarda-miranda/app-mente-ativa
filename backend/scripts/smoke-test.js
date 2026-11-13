const config = require('../src/config');
const { pool, query } = require('../src/db');

/**
 * Teste de fumaça do fluxo de autenticação.
 * Requer a API rodando (npm run dev) e o banco criado (npm run db:setup).
 *
 * Uso: npm run smoke
 */
const API_URL = (process.env.API_URL || `http://127.0.0.1:${config.port}`).replace(/\/+$/, '');
const runEmail = `smoke.${Date.now()}@menteativa.com`;
const runPassword = 'Smoke@Teste123';

const results = [];

function record(name, passed, details = '') {
  results.push({ name, passed, details });
  const icon = passed ? 'PASS' : 'FAIL';
  console.log(`[${icon}] ${name}${details ? ` -> ${details}` : ''}`);
}

async function request(method, path, { body, token } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    return { status: response.status, data };
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  console.log(`\nAPI: ${API_URL}\n`);

  let token = null;

  try {
    const health = await request('GET', '/health');
    record('GET /health responde 200 com banco conectado', health.status === 200 && health.data?.db === true, `status ${health.status}`);
  } catch (error) {
    record('GET /health', false, error.message);
    console.error('\nA API nao respondeu. Rode "npm run dev" em outro terminal.\n');
    process.exitCode = 1;
    return;
  }

  const weakPassword = await request('POST', '/register', {
    body: { name: 'Senha Fraca', email: runEmail, password: '123' },
  });
  record('POST /register rejeita senha fraca (400)', weakPassword.status === 400, `status ${weakPassword.status}`);

  const register = await request('POST', '/register', {
    body: { name: 'Usuario Smoke', email: runEmail, password: runPassword },
  });
  token = register.data?.token || null;
  record(
    'POST /register cria conta e devolve token (201)',
    register.status === 201 && Boolean(token) && register.data?.user?.email === runEmail,
    `status ${register.status}`
  );

  const duplicate = await request('POST', '/register', {
    body: { name: 'Usuario Smoke', email: runEmail.toUpperCase(), password: runPassword },
  });
  record('POST /register recusa e-mail duplicado (409)', duplicate.status === 409, `status ${duplicate.status}`);

  const login = await request('POST', '/login', {
    body: { email: runEmail, password: runPassword },
  });
  token = login.data?.token || token;
  record('POST /login autentica com a senha correta (200)', login.status === 200 && Boolean(login.data?.token), `status ${login.status}`);

  const wrongPassword = await request('POST', '/login', {
    body: { email: runEmail, password: 'SenhaErrada@123' },
  });
  record('POST /login recusa senha errada (401)', wrongPassword.status === 401, `status ${wrongPassword.status}`);

  const unknownUser = await request('POST', '/login', {
    body: { email: `naoexiste.${Date.now()}@menteativa.com`, password: runPassword },
  });
  record('POST /login recusa e-mail inexistente (401)', unknownUser.status === 401, `status ${unknownUser.status}`);

  const me = await request('GET', '/me', { token });
  record('GET /me devolve o usuario autenticado (200)', me.status === 200 && me.data?.user?.email === runEmail, `status ${me.status}`);

  const meWithoutToken = await request('GET', '/me');
  record('GET /me sem token e bloqueado (401)', meWithoutToken.status === 401, `status ${meWithoutToken.status}`);

  const meWithBadToken = await request('GET', '/me', { token: 'token.invalido.aqui' });
  record('GET /me com token invalido e bloqueado (401)', meWithBadToken.status === 401, `status ${meWithBadToken.status}`);

  const verify = await request('POST', '/verifyToken', { token });
  record('POST /verifyToken valida o token (200)', verify.status === 200 && verify.data?.valid === true, `status ${verify.status}`);

  const progressWithoutToken = await request('GET', '/progress');
  record('GET /progress sem token e bloqueado (401)', progressWithoutToken.status === 401, `status ${progressWithoutToken.status}`);

  const emptyProgress = await request('GET', '/progress', { token });
  record(
    'GET /progress inicia zerado com os 3 jogos (200)',
    emptyProgress.status === 200 &&
      emptyProgress.data?.summary?.totalSessions === 0 &&
      emptyProgress.data?.games?.length === 3,
    `status ${emptyProgress.status}`
  );

  const invalidSession = await request('POST', '/progress/sessions', {
    token,
    body: { gameKey: 'sequencia', totalQuestions: 10, correctAnswers: 11 },
  });
  record(
    'POST /progress/sessions recusa acertos > total (400)',
    invalidSession.status === 400,
    `status ${invalidSession.status}`
  );

  const invalidGame = await request('POST', '/progress/sessions', {
    token,
    body: { gameKey: 'jogo-inexistente', totalQuestions: 10, correctAnswers: 5 },
  });
  record(
    'POST /progress/sessions recusa jogo desconhecido (400)',
    invalidGame.status === 400,
    `status ${invalidGame.status}`
  );

  const session = await request('POST', '/progress/sessions', {
    token,
    body: { gameKey: 'sequencia', totalQuestions: 10, correctAnswers: 8, durationSeconds: 95 },
  });
  record(
    'POST /progress/sessions registra a partida (201)',
    session.status === 201 && session.data?.session?.correctAnswers === 8,
    `status ${session.status}`
  );

  const progress = await request('GET', '/progress', { token });
  const sequenceGame = progress.data?.games?.find((game) => game.key === 'sequencia');
  record(
    'GET /progress agrega partidas e acertos (200)',
    progress.status === 200 &&
      progress.data?.summary?.totalSessions === 1 &&
      progress.data?.summary?.overallAccuracy === 80 &&
      sequenceGame?.sessions === 1 &&
      sequenceGame?.accuracy === 80,
    `status ${progress.status}`
  );

  await query('DELETE FROM users WHERE lower(email) = lower($1)', [runEmail]);
  console.log('\nUsuario de teste removido do banco.');

  const failures = results.filter((result) => !result.passed);
  console.log(`\n${results.length - failures.length}/${results.length} verificacoes passaram.`);
  if (failures.length > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error('\nFalha inesperada no smoke test:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });
