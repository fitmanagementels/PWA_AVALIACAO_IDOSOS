import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('installs a new cache version and removes the obsolete application shell', () => {
  const source = fs.readFileSync('web/sw.js', 'utf8');

  assert.match(source, /const CACHE = 'avaliacao-idosos-v13';/);
  assert.match(source, /date-format\.js/);
  assert.match(source, /history-cache\.js/);
  assert.match(source, /result-presentation\.js/);
  assert.match(source, /report-selection\.js/);
  assert.match(source, /sync-status\.js/);
  assert.match(source, /views\/sync-panel\.js/);
  assert.match(source, /views\/selection-controls\.js/);
  assert.match(source, /views\/xsteam-select\.js/);
  assert.match(source, /js\/navigation-guard\.js/);
  assert.match(source, /icons\/xsteam-mark\.svg/);
  assert.match(source, /self\.skipWaiting\(\)/);
  assert.match(source, /caches\.keys\(\)/);
  assert.match(source, /cacheName !== CACHE/);
});
