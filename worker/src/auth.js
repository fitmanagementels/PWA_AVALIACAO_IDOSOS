import { HttpError } from './http.js';

const GOOGLE_CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function parseToken(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new HttpError(401, 'UNAUTHORIZED', 'Token de identidade inválido.');
  try {
    return {
      header: JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0]))),
      claims: JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[1]))),
      signature: decodeBase64Url(parts[2]),
      signedData: new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    };
  } catch {
    throw new HttpError(401, 'UNAUTHORIZED', 'Token de identidade inválido.');
  }
}

async function googleJwks(dependencies) {
  const cache = dependencies.cache || caches.default;
  const request = new Request(GOOGLE_CERTS_URL);
  let response = await cache.match(request);
  if (!response) {
    response = await (dependencies.fetch || fetch)(request);
    if (!response.ok) throw new HttpError(503, 'IDENTITY_UNAVAILABLE', 'Não foi possível validar a identidade agora.');
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'public, max-age=300');
    const cacheable = new Response(response.body, { status: response.status, headers });
    await cache.put(request, cacheable.clone());
    response = cacheable;
  }
  const body = await response.json();
  return Array.isArray(body.keys) ? body.keys : [];
}

export async function verifyGoogleToken(token, dependencies = {}) {
  const parsed = parseToken(token);
  if (parsed.header.alg !== 'RS256' || !parsed.header.kid) throw new HttpError(401, 'UNAUTHORIZED', 'Token de identidade inválido.');
  const keyDefinition = (await googleJwks(dependencies)).find((key) => key.kid === parsed.header.kid && key.kty === 'RSA');
  if (!keyDefinition) throw new HttpError(401, 'UNAUTHORIZED', 'A chave do token não é reconhecida.');
  try {
    const key = await crypto.subtle.importKey('jwk', keyDefinition, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, parsed.signature, parsed.signedData)) {
      throw new HttpError(401, 'UNAUTHORIZED', 'Assinatura de identidade inválida.');
    }
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(401, 'UNAUTHORIZED', 'Assinatura de identidade inválida.');
  }
  return parsed.claims;
}

function authorizedEmails(raw) {
  return new Set(String(raw || '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean));
}

export function validateGoogleClaims(claims, env, now = Date.now()) {
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!GOOGLE_ISSUERS.has(claims.iss) || !audience.includes(env.GOOGLE_CLIENT_ID) || !Number.isFinite(claims.exp)
    || claims.exp * 1000 <= now || claims.email_verified !== true || !claims.email || !claims.sub) {
    throw new HttpError(401, 'UNAUTHORIZED', 'A identidade Google não atende aos requisitos de acesso.');
  }
  if (!authorizedEmails(env.AUTHORIZED_EMAILS).has(String(claims.email).toLowerCase())) {
    throw new HttpError(403, 'FORBIDDEN', 'Esta conta Google não tem acesso à avaliação funcional.');
  }
  return { email: claims.email, subject: claims.sub };
}

export async function requireAuthorizedUser(request, env, dependencies = {}) {
  const token = request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new HttpError(401, 'UNAUTHORIZED', 'Entre com a conta Google autorizada para continuar.');
  const claims = await (dependencies.verifyToken || verifyGoogleToken)(token, dependencies);
  return validateGoogleClaims(claims, env, dependencies.now || Date.now());
}
