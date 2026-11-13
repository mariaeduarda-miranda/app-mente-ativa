const multer = require('multer');
const config = require('./config');
const { query } = require('./db');
const { toPublicUser } = require('./authController');
const { saveAvatar, deleteAvatar } = require('./avatarStorage');

/**
 * Formatos aceitos no upload. O sharp converte tudo para WebP antes de gravar,
 * entao o formato original so precisa ser uma imagem suportada.
 */
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.avatarMaxBytes,
    files: 1,
    fields: 4,
  },
  fileFilter: (req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return callback(
        httpError(400, 'Envie uma imagem JPG, PNG ou WebP para a foto de perfil.')
      );
    }
    return callback(null, true);
  },
});

/**
 * PUT /me/avatar (multipart/form-data, campo "avatar")
 * Substitui a foto de perfil do usuario autenticado.
 */
async function updateAvatar(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'Selecione uma imagem para enviar.' });
  }

  let saved = null;
  try {
    saved = await saveAvatar(req.user.id, req.file.buffer);
  } catch (error) {
    console.warn('[avatar] Imagem invalida:', error.message);
    return res.status(400).json({
      error: 'Não foi possível processar a imagem. Tente outra foto.',
    });
  }

  let rows;
  try {
    // O CTE devolve o caminho antigo junto com a linha atualizada para que o
    // arquivo anterior possa ser removido sem uma segunda consulta.
    ({ rows } = await query(
      `WITH previous AS (
         SELECT id, avatar_path
           FROM users
          WHERE id = $2 AND is_active = TRUE
       )
       UPDATE users u
          SET avatar_path = $1
         FROM previous p
        WHERE u.id = p.id
        RETURNING u.id, u.name, u.email, u.is_active, u.avatar_path,
                  u.created_at, u.updated_at, p.avatar_path AS previous_avatar_path`,
      [saved.relativePath, req.user.id]
    ));
  } catch (error) {
    await deleteAvatar(saved.relativePath);
    throw error;
  }

  const user = rows[0];
  if (!user) {
    await deleteAvatar(saved.relativePath);
    return res.status(401).json({ error: 'Sessão inválida. Faça login novamente.' });
  }

  if (user.previous_avatar_path && user.previous_avatar_path !== saved.relativePath) {
    await deleteAvatar(user.previous_avatar_path);
  }

  return res.status(200).json({
    message: 'Foto de perfil atualizada com sucesso.',
    user: toPublicUser(user),
  });
}

/**
 * DELETE /me/avatar
 * Remove a foto atual e volta ao avatar padrao do app.
 */
async function removeAvatar(req, res) {
  const { rows } = await query(
    `WITH previous AS (
       SELECT id, avatar_path
         FROM users
        WHERE id = $1 AND is_active = TRUE
     )
     UPDATE users u
        SET avatar_path = NULL
       FROM previous p
      WHERE u.id = p.id
      RETURNING u.id, u.name, u.email, u.is_active, u.avatar_path,
                u.created_at, u.updated_at, p.avatar_path AS previous_avatar_path`,
    [req.user.id]
  );

  const user = rows[0];
  if (!user) {
    return res.status(401).json({ error: 'Sessão inválida. Faça login novamente.' });
  }

  await deleteAvatar(user.previous_avatar_path);

  return res.status(200).json({
    message: 'Foto de perfil removida.',
    user: toPublicUser(user),
  });
}

module.exports = {
  updateAvatar,
  removeAvatar,
  uploadAvatarImage: upload.single('avatar'),
};
