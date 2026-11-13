const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const config = require('../src/config');
const { pool, query } = require('../src/db');

/**
 * Aplica o schema (sql/001_init.sql) de forma idempotente e cria o usuario
 * de teste definido no .env (SEED_USER_*).
 *
 * Uso: npm run db:setup
 */
async function main() {
  const schemaPath = path.resolve(__dirname, '..', 'sql', '001_init.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  console.log('[db:setup] Aplicando schema...');
  await query(schema);
  console.log('[db:setup] Schema aplicado com sucesso.');

  const email = config.seed.email.trim().toLowerCase();
  const existing = await query('SELECT id FROM users WHERE lower(email) = lower($1)', [email]);

  if (existing.rowCount > 0) {
    console.log(`[db:setup] Usuario de teste ja existe: ${email}`);
  } else {
    const passwordHash = await bcrypt.hash(config.seed.password, config.bcryptRounds);
    await query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (lower(email)) DO NOTHING`,
      [config.seed.name.trim(), email, passwordHash]
    );
    console.log('[db:setup] Usuario de teste criado:');
    console.log(`           e-mail: ${email}`);
    console.log(`           senha:  ${config.seed.password}`);
  }

  const { rows } = await query(
    'SELECT count(*)::int AS total FROM users WHERE is_active = TRUE'
  );
  console.log(`[db:setup] Total de usuarios ativos: ${rows[0].total}`);
}

main()
  .catch((error) => {
    console.error('[db:setup] Falhou:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });
