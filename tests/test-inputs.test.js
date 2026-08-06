import assert from 'node:assert/strict';
import test from 'node:test';
import { replaceTestDraftInputs, testCardSummary, testInputNames } from '../web/js/test-inputs.js';

test('lists only the four bilateral attempt names for Back Scratch', () => {
  assert.deepEqual(testInputNames('back-scratch'), [
    'back-scratch-direito-1', 'back-scratch-direito-2',
    'back-scratch-esquerdo-1', 'back-scratch-esquerdo-2',
  ]);
});

test('replaces only one test draft and keeps assessment notes and other test values', () => {
  const next = replaceTestDraftInputs(
    { testNotes: 'nota', 'back-scratch-direito-1': '8', 'chair-sit-reach-direito-1': '2' },
    'back-scratch',
    { 'back-scratch-direito-1': '12', 'back-scratch-direito-2': '11' },
  );

  assert.deepEqual(next, {
    testNotes: 'nota',
    'chair-sit-reach-direito-1': '2',
    'back-scratch-direito-1': '12',
    'back-scratch-direito-2': '11',
  });
});

test('summarizes empty, complete and non-completed test cards without classifications', () => {
  assert.deepEqual(testCardSummary({ testId: 'back-scratch', draftInputs: {}, result: null }), {
    state: 'empty', text: 'Nenhuma tentativa', entered: 0, total: 4,
  });
  assert.deepEqual(testCardSummary({
    testId: 'back-scratch',
    draftInputs: {
      'back-scratch-direito-1': '12', 'back-scratch-direito-2': '11',
      'back-scratch-esquerdo-1': '8', 'back-scratch-esquerdo-2': '10',
    },
    result: null,
  }), {
    state: 'complete', text: 'Direito: 12 cm · Esquerdo: 10 cm', entered: 4, total: 4,
  });
  assert.deepEqual(testCardSummary({
    testId: 'back-scratch',
    draftInputs: { 'back-scratch-not-completed': 'on', 'back-scratch-reason': 'Dor' },
    result: null,
  }), {
    state: 'not-completed', text: 'Não concluído: Dor', entered: 0, total: 4,
  });
});

test('keeps the SPPB fields separate and reports its partial progress', () => {
  assert.deepEqual(testInputNames('sppb'), [
    'sppb-gait-1', 'sppb-gait-2', 'sppb-chair', 'sppb-feet', 'sppb-semi', 'sppb-tandem',
  ]);
  assert.deepEqual(testCardSummary({
    testId: 'sppb', draftInputs: { 'sppb-gait-1': '7.4', 'sppb-chair': '12' }, result: null,
  }), {
    state: 'partial', text: '2 de 6 campos preenchidos', entered: 2, total: 6,
  });
});

test('summarizes a persisted non-completed result using its saved reason', () => {
  assert.deepEqual(testCardSummary({
    testId: 'step-2min', draftInputs: {}, result: { status: 'naoConcluido', reason: 'Insegurança' },
  }), {
    state: 'not-completed', text: 'Não concluído: Insegurança', entered: 0, total: 1,
  });
});

test('uses the persisted single-side value when the local draft was cleared', () => {
  assert.deepEqual(testCardSummary({
    testId: 'step-2min', draftInputs: {}, result: { status: 'concluido', officialBySide: { unico: 84 } },
  }), {
    state: 'complete', text: '84 elevações', entered: 1, total: 1,
  });
});
