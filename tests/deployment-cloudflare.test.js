import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('documenta secrets fora do Git e a ordem segura de deploy', () => {
  const doc = readFileSync('docs/deployment-cloudflare.md', 'utf8');
  assert.match(doc, /wrangler secret put AUTHORIZED_EMAILS/);
  assert.match(doc, /d1 migrations apply pwa-avaliacao-idosos --remote/);
  assert.match(doc, /pages deploy web/);
  assert.doesNotMatch(doc, /AUTHORIZED_EMAILS=.*@/);
});

test('declara cabeçalhos estáticos que permitem GSI sem liberar a API a qualquer origem', () => {
  const headers = readFileSync('web/_headers', 'utf8');
  assert.match(headers, /X-Frame-Options: DENY/);
  assert.match(headers, /https:\/\/accounts\.google\.com/);
  assert.match(headers, /https:\/\/pwa-avaliacao-idosos-api\.fitmanagement-els\.workers\.dev/);
});
