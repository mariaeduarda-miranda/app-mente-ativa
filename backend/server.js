const os = require('os');
const config = require('./src/config');
const app = require('./src/app');
const { pool } = require('./src/db');

function getLocalIpv4Addresses() {
  const addresses = [];
  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const iface of interfaces || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

async function start() {
  try {
    await pool.query('SELECT 1');
    console.log('[db] PostgreSQL conectado.');
  } catch (error) {
    console.error('[db] Nao foi possivel conectar ao PostgreSQL:', error.message);
    console.error('[db] Verifique se o container esta rodando: npm run db:up');
    await pool.end().catch(() => {});
    process.exit(1);
  }

  const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(`[api] Mente Ativa API ouvindo em http://localhost:${config.port}`);
    console.log('[api] Use Ctrl+C para encerrar.');

    for (const address of getLocalIpv4Addresses()) {
      console.log(`[api] Celular fisico (mesma rede): http://${address}:${config.port}`);
    }
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(
        `[api] A porta ${config.port} ja esta em uso. Encerre o outro processo ou troque PORT no .env.`
      );
    } else {
      console.error('[api] Erro no servidor HTTP:', error);
    }
    process.exit(1);
  });

  let shuttingDown = false;
  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n[api] Recebido ${signal}, encerrando...`);
    server.close(async () => {
      await pool.end().catch(() => {});
      process.exit(0);
    });
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
