import assert from 'node:assert/strict';
import test from 'node:test';
import { validateGoogleClaims } from '../worker/src/auth.js';
import { createWorker } from '../worker/src/index.js';

const env = {
  ALLOWED_ORIGIN: 'https://avaliacao.pages.dev',
  GOOGLE_CLIENT_ID: 'client-id',
  AUTHORIZED_EMAILS: 'elo@xsteam.com, victor@xsteam.com',
};
const claims = (email) => ({
  iss: 'https://accounts.google.com', aud: 'client-id', exp: Math.floor(Date.now() / 1000) + 3600,
  email, email_verified: true, sub: 'google-subject',
});

test('aceita e-mail verificado presente na allowlist', () => {
  assert.deepEqual(validateGoogleClaims(claims('elo@xsteam.com'), env), { email: 'elo@xsteam.com', subject: 'google-subject' });
});

test('rejeita token sem email verificado', () => {
  assert.throws(() => validateGoogleClaims({ ...claims('elo@xsteam.com'), email_verified: false }, env), /requisitos/);
});

test('rejeita todas as rotas api sem Bearer token', async () => {
  const response = await createWorker().fetch(new Request('https://api.example/api/people', { headers: { Origin: env.ALLOWED_ORIGIN } }), env);
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, 'UNAUTHORIZED');
});
