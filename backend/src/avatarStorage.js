const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const config = require('./config');

const AVATAR_SUBDIR = 'avatars';

const uploadsRoot = path.resolve(config.uploadsDir);
const avatarDir = path.join(uploadsRoot, AVATAR_SUBDIR);

function absolutePathFor(relativePath) {
  const normalized = path.normalize(String(relativePath || ''));
  const fullPath = path.resolve(uploadsRoot, normalized);

  if (fullPath !== uploadsRoot && !fullPath.startsWith(uploadsRoot + path.sep)) {
    throw new Error('Caminho de avatar invalido.');
  }

  return fullPath;
}

function toRelativePath(filename) {
  return `${AVATAR_SUBDIR}/${filename}`;
}

async function saveAvatar(userId, buffer) {
  const processed = await sharp(buffer, { failOn: 'error' })
    .rotate()
    .resize(config.avatarDimension, config.avatarDimension, {
      fit: 'cover',
      position: 'centre',
    })
    .webp({ quality: config.avatarQuality, effort: 4 })
    .toBuffer();

  await fs.promises.mkdir(avatarDir, { recursive: true });

  const safeUserId = String(userId).replace(/[^a-zA-Z0-9-]/g, '');
  const filename = `${safeUserId}-${Date.now()}-${crypto
    .randomBytes(4)
    .toString('hex')}.webp`;

  await fs.promises.writeFile(path.join(avatarDir, filename), processed);

  return { relativePath: toRelativePath(filename), size: processed.length };
}

async function deleteAvatar(relativePath) {
  if (!relativePath) return;

  try {
    await fs.promises.unlink(absolutePathFor(relativePath));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`[avatar] Nao foi possivel remover ${relativePath}:`, error.message);
    }
  }
}

module.exports = {
  avatarDir,
  absolutePathFor,
  saveAvatar,
  deleteAvatar,
};
