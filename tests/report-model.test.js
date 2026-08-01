import assert from 'node:assert/strict';
import test from 'node:test';
import { buildReportModel } from '../shared/report-model.js';

const assessment = {
  person: { name: 'Maria', birthDate: '1954-01-01' },
  assessment: { date: '2026-08-01', professionalName: 'Elohim', testNotes: 'cadeira instável', studentObservations: 'Usou apoio ao final.' },
  results: [{ testId: 'step-2min', status: 'concluido', officialValue: 81, unit: 'elevações', classification: 'média', attempts: [{ value: 76 }, { value: 81 }] }]
};

test('omits internal test notes and includes student observations only when supplied', () => {
  const model = buildReportModel(assessment);
  assert.equal(JSON.stringify(model).includes('cadeira instável'), false);
  assert.equal(model.summary.studentObservations, 'Usou apoio ao final.');
});

test('uses official value instead of all attempt values in technical results', () => {
  const model = buildReportModel(assessment);
  assert.equal(model.technical.results[0].value, '81 elevações');
  assert.equal(JSON.stringify(model.technical).includes('76'), false);
});
