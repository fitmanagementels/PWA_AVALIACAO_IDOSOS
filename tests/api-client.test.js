import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('aborts a request that exceeds the synchronization timeout', () => {
  const source = fs.readFileSync('web/js/api-client.js', 'utf8');
  assert.match(source, /AbortController/);
  assert.match(source, /setTimeout/);
});

test('uses an anonymous request when calling the public Apps Script Web App from GitHub Pages', async () => {
  const previousWindow = globalThis.window;
  const previousFetch = globalThis.fetch;
  const calls = [];

  globalThis.window = { APP_API_URL: 'https://script.google.com/macros/s/example/exec' };
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return { json: async () => ({ ok: true, data: {} }) };
  };

  try {
    const { request } = await import(`../web/js/api-client.js?google-session-test=${Date.now()}`);
    await request('health', {}, 'GET');
    assert.equal(calls[0].options.credentials, 'omit');
  } finally {
    globalThis.window = previousWindow;
    globalThis.fetch = previousFetch;
  }
});

test('uses google.script.run from the Apps Script operational runtime', async () => {
  const previousWindow = globalThis.window;
  const previousGoogle = globalThis.google;
  const calls = [];

  globalThis.google = {
    script: {
      run: {
        withSuccessHandler(onSuccess) {
          return {
            withFailureHandler() {
              return {
                listPeople(payload) {
                  calls.push(payload);
                  onSuccess({ ok: true, data: [{ pessoaId: 'pessoa-operacional' }] });
                }
              };
            }
          };
        }
      }
    }
  };
  globalThis.window = { APP_RUNTIME: 'apps-script', google: globalThis.google };

  try {
    const { request } = await import(`../web/js/api-client.js?apps-script-runtime-test=${Date.now()}`);
    const response = await request('listPeople', {}, 'GET');
    assert.deepEqual(response.data, [{ pessoaId: 'pessoa-operacional' }]);
    assert.deepEqual(calls, [{}]);
  } finally {
    globalThis.window = previousWindow;
    globalThis.google = previousGoogle;
  }
});

test('envia Bearer token e usa rota REST ao operar com Cloudflare', async () => {
  const previousWindow = globalThis.window;
  const previousFetch = globalThis.fetch;
  const calls = [];
  globalThis.window = {
    APP_BACKEND: 'cloudflare', APP_API_URL: 'https://api.example',
    getIdentityToken: async () => 'signed-google-token',
  };
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return { json: async () => ({ ok: true, data: [{ id: 'person-1', fullName: 'Maria', birthDate: '1950-01-01', sex: 'feminino' }] }) };
  };
  try {
    const { request } = await import(`../web/js/api-client.js?cloudflare-test=${Date.now()}`);
    const response = await request('listPeople', {}, 'GET');
    assert.equal(calls[0].url, 'https://api.example/api/people');
    assert.equal(calls[0].options.headers.Authorization, 'Bearer signed-google-token');
    assert.equal(calls[0].options.credentials, 'omit');
    assert.equal(response.data[0].pessoaId, 'person-1');
  } finally {
    globalThis.window = previousWindow;
    globalThis.fetch = previousFetch;
  }
});

test('converte o salvamento legado para o corpo REST do Worker', async () => {
  const previousWindow = globalThis.window;
  const previousFetch = globalThis.fetch;
  let call;
  globalThis.window = { APP_BACKEND: 'cloudflare', APP_API_URL: 'https://api.example', getIdentityToken: async () => 'token' };
  globalThis.fetch = async (url, options) => {
    call = { url, options };
    return { json: async () => ({ ok: true, data: { assessmentId: 'assessment-1' } }) };
  };
  try {
    const { request } = await import(`../web/js/api-client.js?cloudflare-save-test=${Date.now()}`);
    await request('createAssessment', { avaliacaoId: 'assessment-1', pessoaId: 'person-1', data: '2026-08-27', profissionalNome: 'Elohim', testesSelecionados: ['sppb'] });
    assert.equal(call.url, 'https://api.example/api/assessments');
    assert.deepEqual(JSON.parse(call.options.body), {
      id: 'assessment-1', personId: 'person-1', assessmentDate: '2026-08-27', professionalId: 'professional-elohim',
      testIds: ['sppb'], testNotes: '', studentObservations: '', results: []
    });
  } finally {
    globalThis.window = previousWindow;
    globalThis.fetch = previousFetch;
  }
});
