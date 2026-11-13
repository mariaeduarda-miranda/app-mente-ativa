const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72; // limite do bcrypt

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function validateEmail(email) {
  const value = normalizeEmail(email);
  if (!value) return 'Informe o e-mail.';
  if (value.length > 254 || !EMAIL_REGEX.test(value)) return 'Informe um e-mail válido.';
  return null;
}

function validatePassword(password, { isRegistration = true } = {}) {
  const value = String(password || '');
  if (!value) return 'Informe a senha.';
  if (!isRegistration) return null;
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `A senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (value.length > MAX_PASSWORD_LENGTH) {
    return `A senha deve ter no máximo ${MAX_PASSWORD_LENGTH} caracteres.`;
  }
  return null;
}

function validateName(name) {
  const value = String(name || '').trim();
  if (!value) return 'Informe o nome.';
  if (value.length < 2 || value.length > 120) return 'O nome deve ter entre 2 e 120 caracteres.';
  return null;
}

/**
 * Valida o payload de cadastro. Retorna a lista de erros encontrados.
 */
function validateRegistration({ name, email, password }) {
  return [
    validateName(name),
    validateEmail(email),
    validatePassword(password, { isRegistration: true }),
  ].filter(Boolean);
}

/**
 * Valida o payload de login. Nao aplica politica de senha: senhas antigas
 * (ou criadas por outros meios) devem continuar conseguindo autenticar.
 */
function validateLogin({ email, password }) {
  return [validateEmail(email), validatePassword(password, { isRegistration: false })].filter(
    Boolean
  );
}

/**
 * Valida a atualizacao de perfil. Somente os campos enviados sao validados,
 * e ao menos um deles precisa estar presente.
 */
function validateProfileUpdate({ name, email }) {
  const errors = [];
  let hasField = false;

  if (name !== undefined) {
    hasField = true;
    const error = validateName(name);
    if (error) errors.push(error);
  }

  if (email !== undefined) {
    hasField = true;
    const error = validateEmail(email);
    if (error) errors.push(error);
  }

  if (!hasField) errors.push('Informe ao menos um campo para atualizar.');
  return errors;
}

module.exports = {
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  normalizeEmail,
  validateName,
  validateEmail,
  validatePassword,
  validateRegistration,
  validateLogin,
  validateProfileUpdate,
};
