-- =============================================================================
-- Mente Ativa - Schema inicial (PostgreSQL 13+)
-- Idempotente: pode ser executado varias vezes sem erro.
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  email         TEXT        NOT NULL,
  password_hash TEXT        NOT NULL,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_name_length  CHECK (char_length(btrim(name)) BETWEEN 2 AND 120),
  CONSTRAINT users_email_format CHECK (position('@' IN email) > 1)
);

-- E-mail e unico sem diferenciar maiusculas/minusculas.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_uidx ON users (lower(email));

-- Mantem updated_at sempre atualizado.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
