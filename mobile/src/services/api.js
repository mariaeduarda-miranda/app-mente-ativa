import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Configuracao da API do Mente Ativa.
 *
 * Ordem de resolucao da URL base:
 * 1. EXPO_PUBLIC_API_URL (definida no terminal antes de iniciar o Expo)
 * 2. IP do computador que esta servindo o Metro (funciona no celular fisico
 *    e no emulador, desde que a API esteja na porta 3000)
 * 3. Fallback por plataforma: 10.0.2.2 no emulador Android, 127.0.0.1 no iOS/web
 */
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

/**
 * Erro padronizado da API.
 * `status === 0` indica falha de rede (servidor offline, IP errado, firewall).
 */
export class ApiError extends Error {
  constructor(message, { status = 0, data = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request(path, { method = 'GET', body, token, timeoutMs = 15000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
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
        'Verifique se o backend está rodando e se o celular está na mesma rede.',
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

/** Autentica uma conta existente. */
export function loginUser(email, password) {
  return request('/login', {
    method: 'POST',
    body: { email: String(email).trim(), password },
  });
}

/** Cria uma conta nova e ja devolve o token de sessao. */
export function registerUser({ name, email, password }) {
  return request('/register', {
    method: 'POST',
    body: { name: String(name).trim(), email: String(email).trim(), password },
  });
}

/** Valida o token salvo no dispositivo e devolve os dados atualizados do usuario. */
export function verifyToken(token) {
  return request('/verifyToken', { method: 'POST', body: { token }, token });
}

/** Rota protegida: exige o token no header Authorization. */
export function getMe(token) {
  return request('/me', { token });
}

/**
 * Atualiza nome e/ou e-mail do usuário autenticado.
 * A API devolve uma sessão renovada (novo token + usuário atualizado).
 */
export function updateProfile(token, { name, email }) {
  const body = {};
  if (name !== undefined) body.name = String(name).trim();
  if (email !== undefined) body.email = String(email).trim();

  return request('/me', { method: 'PUT', body, token });
}

/** Troca a senha confirmando a senha atual. */
export function changePassword(token, { currentPassword, newPassword }) {
  return request('/me/password', {
    method: 'PUT',
    body: { currentPassword, newPassword },
    token,
  });
}

/** Diagnostico rapido do backend. */
export function health() {
  return request('/health', { timeoutMs: 5000 });
}

/** Progresso agregado do usuário autenticado (partidas e acertos por jogo). */
export function getProgress(token) {
  return request('/progress', { token });
}

/** Registra uma partida concluída para o progresso do usuário. */
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
