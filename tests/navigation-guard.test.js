import assert from 'node:assert/strict';
import test from 'node:test';
import { isCurrentNavigation, isCurrentPage, startNavigation } from '../web/js/navigation-guard.js';

test('invalidates a previous screen token when navigation advances', () => {
  const history = startNavigation('history');
  assert.equal(isCurrentNavigation(history), true);

  const person = startNavigation('person');
  assert.equal(isCurrentNavigation(history), false);
  assert.equal(isCurrentNavigation(person), true);
  assert.equal(isCurrentPage('person'), true);
});
