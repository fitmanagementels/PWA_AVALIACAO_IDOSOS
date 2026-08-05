import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('refreshes the people list only while the people page is active', () => {
  const source = fs.readFileSync('web/js/app.js', 'utf8');

  assert.match(source, /import \{ isCurrentPage \} from '\.\/navigation-guard\.js';/);
  assert.match(source, /if \(isCurrentPage\('people'\)\) renderPeople\(root\);/);
});
