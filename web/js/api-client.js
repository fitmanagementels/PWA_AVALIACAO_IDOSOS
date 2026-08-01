export class ApiError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

export async function request(action, payload = {}, method = 'POST') {
  const baseUrl = window.APP_API_URL;
  if (!baseUrl) throw new ApiError('CONFIGURATION_ERROR', 'Defina APP_API_URL antes de sincronizar');
  const url = method === 'GET' ? `${baseUrl}?${new URLSearchParams({ action, ...payload })}` : baseUrl;
  const response = await fetch(url, method === 'GET' ? { method } : { method, body: JSON.stringify({ action, payload }), headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
  const body = await response.json();
  if (!body.ok) throw new ApiError(body.error?.code || 'NETWORK_ERROR', body.error?.message || 'Não foi possível sincronizar');
  return body;
}
