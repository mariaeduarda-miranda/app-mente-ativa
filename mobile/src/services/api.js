import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { File } from 'expo-file-system';

const DEFAULT_PORT = 3000;

function resolveDevHost() {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    '';

  const host = String(hostUri).split('/')[0].split(':')[0];

  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return host;
  }

  return Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
}

const rawBaseUrl =
  process.env.EXPO_PUBLIC_API_URL?.trim() || `http://${resolveDevHost()}:${DEFAULT_PORT}`;

export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');

export function resolveAssetUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

export class ApiError extends Error {
  constructor(message, { status = 0, data = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request(
  path,
  { method = 'GET', body, formData, token, timeoutMs = 15000 } = {}
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers = { Accept: 'application/json' };
  if (body !== undefined && !formData) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: formData || (body === undefined ? undefined : JSON.stringify(body)),
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new ApiError(
        'O servidor demorou demais para responder. Verifique se a API está rodando.',
        { status: 0 }
      );
    }

    throw new ApiError(
      `Não foi possível conectar à API em ${API_BASE_URL}. ` +
        'Verifique se o backend está rodando e se o celular está na mesma rede.' +
        (error?.message ? ` (${error.message})` : ''),
      { status: 0 }
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    throw new ApiError(data?.error || `Falha na requisição (HTTP ${response.status}).`, {
      status: response.status,
      data,
    });
  }

  return data ?? {};
}

export function loginUser(email, password) {
  return request('/login', {
    method: 'POST',
    body: { email: String(email).trim(), password },
  });
}

export function registerUser({ name, email, password }) {
  return request('/register', {
    method: 'POST',
    body: { name: String(name).trim(), email: String(email).trim(), password },
  });
}

export function verifyToken(token) {
  return request('/verifyToken', { method: 'POST', body: { token }, token });
}

export function getMe(token) {
  return request('/me', { token });
}

export function updateProfile(token, { name, email }) {
  const body = {};
  if (name !== undefined) body.name = String(name).trim();
  if (email !== undefined) body.email = String(email).trim();

  return request('/me', { method: 'PUT', body, token });
}

export function changePassword(token, { currentPassword, newPassword }) {
  return request('/me/password', {
    method: 'PUT',
    body: { currentPassword, newPassword },
    token,
  });
}

export function uploadAvatar(token, asset) {
  if (!asset?.uri) {
    return Promise.reject(
      new ApiError('Selecione uma imagem para enviar.', { status: 400 })
    );
  }

  const formData = new FormData();
  const name = asset.fileName || asset.file?.name || 'avatar.jpg';

  if (Platform.OS === 'web' && asset.file) {
    formData.append('avatar', asset.file, name);
  } else {
    formData.append('avatar', new File(asset.uri), name);
  }

  return request('/me/avatar', {
    method: 'PUT',
    formData,
    token,
    timeoutMs: 30000,
  });
}

export function removeAvatar(token) {
  return request('/me/avatar', { method: 'DELETE', token });
}

export function health() {
  return request('/health', { timeoutMs: 5000 });
}

export function getProgress(token) {
  return request('/progress', { token });
}

export function saveGameSession(
  token,
  { gameKey, totalQuestions, correctAnswers, durationSeconds, startedAt }
) {
  return request('/progress/sessions', {
    method: 'POST',
    body: {
      gameKey,
      totalQuestions,
      correctAnswers,
      durationSeconds,
      startedAt,
    },
    token,
  });
}
