-- =============================================================================
-- Mente Ativa - Foto de perfil do usuario
-- Idempotente: pode ser executado varias vezes sem erro.
--
-- A imagem em si nao fica no banco: o arquivo otimizado e gravado em
-- backend/uploads/avatars/*.webp e aqui guardamos apenas o caminho relativo.
-- Isso mantem as consultas leves e o backup do banco pequeno.
-- =============================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_path TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'users_avatar_path_length'
       AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_avatar_path_length
      CHECK (avatar_path IS NULL OR char_length(avatar_path) <= 255);
  END IF;
END;
$$;
