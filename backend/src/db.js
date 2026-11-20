const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (error) => {
  console.error('[db] Erro inesperado em conexao ociosa do pool:', error.message);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
