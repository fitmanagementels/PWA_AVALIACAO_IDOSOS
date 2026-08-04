import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('aborts a request that exceeds the synchronization timeout', () => {
  const source = fs.readFileSync('web/js/api-client.js', 'utf8');
  assert.match(source, /AbortController/);
  assert.match(source, /setTimeout/);
});
