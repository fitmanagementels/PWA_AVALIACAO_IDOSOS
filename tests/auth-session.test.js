import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('mantém a credencial Google somente em memória e a entrega ao cliente API', async () => {
  const previousGoogle = globalThis.google;
  let initialized;
  globalThis.google = {
    accounts: {
      id: {
        initialize(config) { initialized = config; },
        prompt() {},
      },
    },
  };
  try {
    const { getIdentityToken, initializeGoogleSession } = await import(`../web/js/auth-session.js?test=${Date.now()}`);
    initializeGoogleSession({ clientId: 'client-id' });
    initialized.callback({ credential: 'signed-google-token' });
    assert.equal(await getIdentityToken(), 'signed-google-token');
    assert.equal(globalThis.localStorage?.getItem?.('google-token'), undefined);
  } finally {
    globalThis.google = previousGoogle;
  }
});

test('solicita novamente a sessão Google sem persistir credenciais', async () => {
  const previousGoogle = globalThis.google;
  let prompts = 0;
  globalThis.google = { accounts: { id: { prompt() { prompts += 1; } } } };
  try {
    const { promptGoogleSession } = await import(`../web/js/auth-session.js?prompt-test=${Date.now()}`);
    promptGoogleSession();
    assert.equal(prompts, 1);
  } finally {
    globalThis.google = previousGoogle;
  }
});

test('carrega o Google Identity Services e só inicializa sessão no backend Cloudflare', () => {
  const html = fs.readFileSync('web/index.html', 'utf8');
  const app = fs.readFileSync('web/js/app.js', 'utf8');
  assert.match(html, /https:\/\/accounts\.google\.com\/gsi\/client/);
  assert.match(app, /APP_BACKEND === 'cloudflare'/);
  assert.match(app, /initializeGoogleSession/);
});
