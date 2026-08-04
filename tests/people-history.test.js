import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('resolves test names before rendering saved assessment details', () => {
  const source = fs.readFileSync('web/js/views/people.js', 'utf8');
  assert.match(source, /const testName = \(id\) => TESTS\.find/);
});
