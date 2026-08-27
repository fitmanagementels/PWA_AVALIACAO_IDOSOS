import assert from 'node:assert/strict';
import test from 'node:test';

import { createWorker } from '../worker/src/index.js';

const env = { ALLOWED_ORIGIN: 'https://avaliacao.pages.dev' };

test('permite preflight apenas para a origem Pages', async () => {
  const response = await createWorker({ authenticate: async () => ({}) }).fetch(
    new Request('https://api.example/api/people', {
      method: 'OPTIONS',
      headers: { Origin: env.ALLOWED_ORIGIN }
    }),
    env,
  );

  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), env.ALLOWED_ORIGIN);
  assert.match(response.headers.get('access-control-allow-methods'), /DELETE/);
});

test('recusa origem diferente antes de acessar rota protegida', async () => {
  const response = await createWorker({ authenticate: async () => ({}) }).fetch(
    new Request('https://api.example/api/people', {
      headers: { Origin: 'https://attacker.example' }
    }),
    env,
  );

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), {
    ok: false,
    error: { code: 'ORIGIN_NOT_ALLOWED', message: 'A origem desta requisição não é permitida.' }
  });
  assert.equal(response.headers.get('access-control-allow-origin'), null);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('mantém health público e sem informações pessoais fora de api', async () => {
  const response = await createWorker({ authenticate: async () => { throw new Error('não deve autenticar health'); } }).fetch(
    new Request('https://api.example/health'),
    env,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, data: { status: 'ok' } });
});
