import assert from 'node:assert/strict';
import test from 'node:test';
import { buildReportModel } from '../web/js/report-model.js';

const assessment = {
  person: { name: 'Maria', birthDate: '1954-01-01' },
  assessment: { date: '2026-08-01', professionalName: 'Elohim', testNotes: 'cadeira instável', studentObservations: 'Usou apoio ao final.' },
  results: [{ testId: 'step-2min', status: 'concluido', officialValue: 81, unit: 'elevações', classification: 'média', attempts: [{ value: 76 }, { value: 81 }] }],
  includedTestIds: ['step-2min']
};

test('omits internal test notes and includes student observations only when supplied', () => {
  const model = buildReportModel(assessment);
  assert.equal(JSON.stringify(model).includes('cadeira instável'), false);
  assert.equal(model.summary.studentObservations, 'Usou apoio ao final.');
});

test('uses official value instead of all attempt values in technical results', () => {
  const model = buildReportModel(assessment);
  assert.equal(model.technical.domains[0].tests[0].value, '81 elevações');
  assert.equal(JSON.stringify(model.summary).includes('76'), false);
  assert.deepEqual(model.technical.domains[0].tests[0].sides[0].attempts[0], { order: 1, value: '76' });
});

test('groups bilateral official values into one selected test card and calculates age on the assessment date', () => {
  const model = buildReportModel({
    person: { name: 'Maria', birthDate: '1954-08-10' },
    assessment: { date: '2026-08-10', professionalName: 'Elohim' },
    results: [
      { testId: 'knee-extension-isometric', status: 'concluido', side: 'direito', officialValue: 36, unit: 'kgf' },
      { testId: 'knee-extension-isometric', status: 'concluido', side: 'esquerdo', officialValue: 33, unit: 'kgf' }
    ],
    includedTestIds: ['knee-extension-isometric']
  });

  assert.equal(model.meta.age, 72);
  assert.equal(model.summary.cards.length, 1);
  assert.equal(model.summary.cards[0].value, 'D 36 · E 33 kgf');
  assert.deepEqual(model.technical.domains[0].tests[0].sides.map((side) => side.label), ['Direito', 'Esquerdo']);
});

test('keeps only completed selected results without inventing a missing classification', () => {
  const model = buildReportModel({
    person: { name: 'Maria', birthDate: '1954-01-01' },
    assessment: { date: '2026-08-01', professionalName: 'Elohim' },
    results: [
      { testId: 'step-2min', status: 'concluido', officialValue: 81, unit: 'elevações' },
      { testId: 'sppb', status: 'naoConcluido', reason: 'Dor' }
    ],
    includedTestIds: ['step-2min', 'sppb']
  });

  assert.deepEqual(model.summary.cards.map((card) => card.testId), ['step-2min']);
  assert.equal(model.summary.cards[0].classification, null);
});

test('presents SPPB components as seconds instead of a generic score', () => {
  const model = buildReportModel({
    person: { name: 'Maria', birthDate: '1954-01-01' },
    assessment: { date: '2026-08-01' },
    results: [{
      testId: 'sppb', status: 'concluido', unit: 'score',
      officialBySide: { caminhada4m: 4.43, sentarLevantar5x: 7.56, equilibrio: 10 }
    }],
    includedTestIds: ['sppb']
  });

  assert.equal(model.summary.cards[0].value.includes('score'), false);
  assert.deepEqual(model.technical.domains[0].tests[0].sides.map((side) => side.unit), ['s', 's', 's']);
});

test('keeps ordered attempts for technical reading and marks bilateral summaries', () => {
  const model = buildReportModel({
    person: {}, assessment: {},
    results: [{
      testId: 'knee-extension-isometric', status: 'concluido', unit: 'kgf',
      officialBySide: { direito: 20, esquerdo: 19 },
      attempts: [{ side: 'direito', value: 18 }, { side: 'direito', value: 20 }]
    }],
    includedTestIds: ['knee-extension-isometric']
  });

  assert.equal(model.summary.hasBilateral, true);
  assert.deepEqual(model.technical.domains[0].tests[0].sides[0].attempts, [
    { order: 1, value: '18' }, { order: 2, value: '20' }
  ]);
});
