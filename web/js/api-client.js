export class ApiError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

function requestFromAppsScript(action, payload) {
  return new Promise((resolve, reject) => {
    const runner = window.google?.script?.run;
    if (!runner) return reject(new ApiError('APPS_SCRIPT_UNAVAILABLE', 'A conexão operacional com o Apps Script não está disponível'));
    const call = runner
      .withSuccessHandler(resolve)
      .withFailureHandler((error) => reject(new ApiError('APPS_SCRIPT_ERROR', error?.message || 'Não foi possível sincronizar com o Apps Script')));
    if (typeof call[action] !== 'function') return reject(new ApiError('NOT_FOUND', 'Ação não disponível no Apps Script'));
    call[action](payload);
  });
}

export async function request(action, payload = {}, method = 'POST') {
  if (window.APP_RUNTIME === 'apps-script') return requestFromAppsScript(action, payload);
  const baseUrl = window.APP_API_URL;
  if (!baseUrl) throw new ApiError('CONFIGURATION_ERROR', 'Defina APP_API_URL antes de sincronizar');
  const url = method === 'GET' ? `${baseUrl}?${new URLSearchParams({ action, ...payload })}` : baseUrl;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, method === 'GET' ? { method, credentials: 'omit', signal: controller.signal } : { method, body: JSON.stringify({ action, payload }), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, credentials: 'omit', signal: controller.signal });
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
