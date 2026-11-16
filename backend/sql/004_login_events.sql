-- =============================================================================
-- Mente Ativa - Historico de logins (auditoria)
-- Idempotente: pode ser executado varias vezes sem erro.
--
-- Por que esta tabela existe:
-- a API usa um pool de conexoes, entao um login do aplicativo e apenas uma
-- requisicao HTTP curta e NAO aparece em pg_stat_activity (o pgAdmin so ve as
-- conexoes do proprio pool). Aqui cada tentativa de login fica registrada,
-- com sucesso/falha, motivo, IP e user agent.
-- =============================================================================

CREATE TABLE IF NOT EXISTS login_events (
  id         BIGSERIAL PRIMARY KEY,
  -- ON DELETE SET NULL: o historico continua existindo mesmo se a conta for
  -- removida; o e-mail fica gravado para consulta.
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  email      TEXT NOT NULL,
  success    BOOLEAN NOT NULL,
  reason     TEXT,
  ip         TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Consultas mais comuns: ultimos logins e historico de um e-mail.
CREATE INDEX IF NOT EXISTS login_events_created_at_idx
  ON login_events (created_at DESC);

CREATE INDEX IF NOT EXISTS login_events_email_idx
  ON login_events (email);
