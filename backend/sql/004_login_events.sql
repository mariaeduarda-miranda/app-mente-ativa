
CREATE TABLE IF NOT EXISTS login_events (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  email      TEXT NOT NULL,
  success    BOOLEAN NOT NULL,
  reason     TEXT,
  ip         TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS login_events_created_at_idx
  ON login_events (created_at DESC);

CREATE INDEX IF NOT EXISTS login_events_email_idx
  ON login_events (email);
