import assert from 'node:assert/strict';
import test from 'node:test';
import { addSelectedTests, removeSelectedTest } from '../web/js/assessment-domain.js';

test('adds only new tests while preserving the already selected ones', () => {
  assert.deepEqual(addSelectedTests(['step-2min', 'sppb'], ['sppb', 'rowing-isometric']), ['step-2min', 'sppb', 'rowing-isometric']);
});

test('removes only the selected test from an active assessment', () => {
  assert.deepEqual(removeSelectedTest(['back-scratch', 'sppb', 'rowing-isometric'], 'sppb'), ['back-scratch', 'rowing-isometric']);
});
