import assert from 'node:assert/strict';
import test from 'node:test';
import { compareComparableResults } from '../web/js/history-domain.js';

test('compares only identical test, side, unit and protocol version', () => {
  const previous = { testId: 'step-2min', side: null, unit: 'contagem', protocolVersion: 1, value: 80 };
  const current = { testId: 'step-2min', side: null, unit: 'contagem', protocolVersion: 1, value: 86 };
  assert.deepEqual(compareComparableResults(previous, current), { comparable: true, delta: 6 });
  assert.equal(compareComparableResults({ ...previous, testId: 'back-scratch', side: 'esquerdo', unit: 'cm' }, { ...current, testId: 'back-scratch', side: 'direito', unit: 'cm' }).comparable, false);
});
