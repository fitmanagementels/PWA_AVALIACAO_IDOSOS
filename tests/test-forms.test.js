import assert from 'node:assert/strict';
import test from 'node:test';
import { buildResult, markNotCompleted } from '../web/js/assessment-domain.js';

test('requires a reason when a selected test is not completed', () => {
  assert.throws(() => markNotCompleted({ testId: 'step-2min', reason: '' }), /motivo/);
});

test('keeps both knee-extension sides and chooses each side best kgf', () => {
  const result = buildResult({
    testId: 'knee-extension-isometric',
    unit: 'kgf',
    direction: 'highest',
    attempts: [
      { side: 'direito', value: 22 }, { side: 'direito', value: 25 }, { side: 'esquerdo', value: 20 }
    ]
  });
  assert.equal(result.officialBySide.direito, 25);
  assert.equal(result.officialBySide.esquerdo, 20);
});
