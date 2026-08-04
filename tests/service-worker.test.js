import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('installs a new cache version and removes the obsolete application shell', () => {
  const source = fs.readFileSync('web/sw.js', 'utf8');

  assert.match(source, /const CACHE = 'avaliacao-idosos-v4';/);
  assert.match(source, /result-presentation\.js/);
  assert.match(source, /report-selection\.js/);
  assert.match(source, /self\.skipWaiting\(\)/);
  assert.match(source, /caches\.keys\(\)/);
  assert.match(source, /cacheName !== CACHE/);
});
