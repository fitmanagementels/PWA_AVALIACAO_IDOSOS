export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function corsHeaders(request, env) {
  const origin = request.headers.get('Origin');

  if (origin && origin !== env.ALLOWED_ORIGIN) {
    throw new HttpError(
      403,
      'ORIGIN_NOT_ALLOWED',
      'A origem desta requisição não é permitida.',
    );
  }

  if (!origin) return {};

  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    Vary: 'Origin',
  };
}

export function jsonResponse(request, env, status, payload) {
  let cors = {};

  try {
    cors = corsHeaders(request, env);
  } catch {
    // An origin not allowed must not receive permissive CORS headers.
  }

  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...cors,
    },
  });
}

export async function readJsonBody(request, maxBytes = 262144) {
  const length = Number(request.headers.get('Content-Length') || 0);
  if (length > maxBytes) throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'O conteúdo enviado é muito grande.');
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) {
    throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'O conteúdo enviado é muito grande.');
  }
  try {
    const parsed = JSON.parse(raw || '{}');
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('invalid');
    return parsed;
  } catch {
    throw new HttpError(400, 'INVALID_REQUEST', 'O conteúdo JSON da requisição é inválido.');
  }
}
