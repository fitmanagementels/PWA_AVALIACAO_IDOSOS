import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('resolves test names before rendering saved assessment details', () => {
  const source = fs.readFileSync('web/js/views/people.js', 'utf8');
  assert.match(source, /const testName = \(id\) => TESTS\.find/);
});

test('guards delayed history and assessment responses before changing the screen', () => {
  const source = fs.readFileSync('web/js/views/people.js', 'utf8');

  assert.match(source, /import \{ isCurrentNavigation, startNavigation \} from '\.\.\/navigation-guard\.js';/);
  assert.match(source, /const navigation = startNavigation\('history'\);/);
  assert.match(source, /writeHistoryCache\(localStorage, person\.id, assessments\);\s*if \(!isCurrentNavigation\(navigation\)\) return;/);
  assert.match(source, /startNavigation\('assessment-history'\)/);
  assert.match(source, /if \(isCurrentNavigation\(navigation\)\) onBack\(`/);
});
