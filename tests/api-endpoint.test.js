import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('uses the active public Apps Script web app endpoint', () => {
  const source = fs.readFileSync('web/config.js', 'utf8');
  assert.match(source, /AKfycbyHPSpXvbDeEDw02OjYaPX7NustEcXP9-2NHwM2rlzRtWBcAdWcJMP5nsMA_NnCcDUSu/);
});
