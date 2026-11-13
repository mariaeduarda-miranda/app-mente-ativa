-- =============================================================================
-- Mente Ativa - Partidas concluidas (progresso por usuario)
-- Idempotente: pode ser executado varias vezes sem erro.
-- =============================================================================

CREATE TABLE IF NOT EXISTS game_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_key         TEXT NOT NULL,
  total_questions  SMALLINT NOT NULL CHECK (total_questions BETWEEN 1 AND 100),
  correct_answers  SMALLINT NOT NULL CHECK (correct_answers BETWEEN 0 AND total_questions),
  duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  started_at       TIMESTAMPTZ,
  finished_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Consultas da tela "Meu Progresso" filtram por usuario e agrupam por jogo.
CREATE INDEX IF NOT EXISTS game_sessions_user_game_idx
  ON game_sessions (user_id, game_key);

CREATE INDEX IF NOT EXISTS game_sessions_user_finished_idx
  ON game_sessions (user_id, finished_at DESC);
