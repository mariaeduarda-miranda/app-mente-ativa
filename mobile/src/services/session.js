import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Persistencia local da sessao (token JWT + dados do usuario).
 * Centraliza as chaves do AsyncStorage para evitar strings soltas pelo app.
 */
const KEYS = {
  token: '@mente_ativa:token',
  user: '@mente_ativa:user',
  rememberMe: '@mente_ativa:remember_me',
  savedEmail: '@mente_ativa:saved_email',
};

export async function saveSession({ token, user }) {
  const operations = [];
  if (token) operations.push(AsyncStorage.setItem(KEYS.token, token));
  if (user) operations.push(AsyncStorage.setItem(KEYS.user, JSON.stringify(user)));
  await Promise.all(operations);
}

export async function loadSession() {
  const [token, userRaw] = await Promise.all([
    AsyncStorage.getItem(KEYS.token),
    AsyncStorage.getItem(KEYS.user),
  ]);

  let user = null;
  if (userRaw) {
    try {
      user = JSON.parse(userRaw);
    } catch {
      user = null;
    }
  }

  return { token, user };
}

export async function clearSession() {
  await AsyncStorage.multiRemove([KEYS.token, KEYS.user]);
}

/**
 * "Lembrar de mim" guarda apenas o e-mail (nunca a senha).
 */
export async function setRememberMe(email, enabled) {
  if (enabled) {
    await Promise.all([
      AsyncStorage.setItem(KEYS.rememberMe, 'true'),
      AsyncStorage.setItem(KEYS.savedEmail, String(email).trim()),
    ]);
    return;
  }

  await AsyncStorage.multiRemove([KEYS.rememberMe, KEYS.savedEmail]);
}

export async function getRememberMe() {
  const [enabled, email] = await Promise.all([
    AsyncStorage.getItem(KEYS.rememberMe),
    AsyncStorage.getItem(KEYS.savedEmail),
  ]);

  return {
    enabled: enabled === 'true',
    email: email || '',
  };
}
