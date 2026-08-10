export class ApiError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

export async function request(action, payload = {}, method = 'POST') {
  const baseUrl = window.APP_API_URL;
  if (!baseUrl) throw new ApiError('CONFIGURATION_ERROR', 'Defina APP_API_URL antes de sincronizar');
  const url = method === 'GET' ? `${baseUrl}?${new URLSearchParams({ action, ...payload })}` : baseUrl;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, method === 'GET' ? { method, credentials: 'include', signal: controller.signal } : { method, body: JSON.stringify({ action, payload }), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, credentials: 'include', signal: controller.signal });
    const body = await response.json();
    if (!body.ok) throw new ApiError(body.error?.code || 'NETWORK_ERROR', body.error?.message || 'Não foi possível sincronizar');
    return body;
  } catch (error) {
    if (error.name === 'AbortError') throw new ApiError('NETWORK_TIMEOUT', 'A sincronização demorou demais. Os dados continuam salvos neste aparelho.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
