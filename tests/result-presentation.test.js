import assert from 'node:assert/strict';
import test from 'node:test';
import { presentationForResult, sessionColorCounts } from '../web/js/result-presentation.js';

const person = { sex: 'masculino', birthDate: '1962-08-04' };

test('marks a below-average step test as yellow', () => {
  assert.deepEqual(presentationForResult({
    result: { testId: 'step-2min', status: 'concluido', unit: 'elevações', officialBySide: { unico: 80 } },
    person,
    assessmentDate: '2026-08-04'
  }), { state: 'yellow', label: 'Abaixo da referência', officialText: '80 elevações' });
});

test('keeps force result gray without a reference', () => {
  assert.equal(presentationForResult({
    result: { testId: 'rowing-isometric', status: 'concluido', unit: 'kgf', officialBySide: { direito: 24 } },
    person,
    assessmentDate: '2026-08-04'
  }).state, 'gray');
});

test('keeps the step test gray when demographic reference is unavailable', () => {
  assert.equal(presentationForResult({
    result: { testId: 'step-2min', status: 'concluido', unit: 'elevações', officialBySide: { unico: 80 } },
    person: {},
    assessmentDate: '2026-08-04'
  }).state, 'gray');
});

test('counts selected tests with no result as pending', () => {
  assert.deepEqual(sessionColorCounts({
    selectedTestIds: ['step-2min', 'sppb'],
    results: [{ testId: 'step-2min', status: 'concluido', unit: 'elevações', officialBySide: { unico: 80 } }],
    person,
    assessmentDate: '2026-08-04'
  }), { green: 0, yellow: 1, gray: 0, pending: 1 });
});
