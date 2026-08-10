import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('aborts a request that exceeds the synchronization timeout', () => {
  const source = fs.readFileSync('web/js/api-client.js', 'utf8');
  assert.match(source, /AbortController/);
  assert.match(source, /setTimeout/);
});

test('includes the signed-in Google session when calling Apps Script', async () => {
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
    assert.equal(calls[0].options.credentials, 'include');
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
