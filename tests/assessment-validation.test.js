import assert from 'node:assert/strict';
import test from 'node:test';
import { validateAssessmentDraft } from '../shared/assessment-validation.js';

const validAssessment = {
  assessmentId: 'av-1',
  personId: 'p-1',
  professionalName: 'Elohim',
  date: '2026-08-01',
  selectedTestIds: ['step-2min'],
  results: [{ testId: 'step-2min', status: 'concluido', unit: 'contagem', officialValue: 88, attempts: [{ order: 1, value: 88, unit: 'contagem' }] }]
};

test('requires one of the fixed professionals', () => {
  const result = validateAssessmentDraft({ ...validAssessment, professionalName: 'Outro' });
  assert.deepEqual(result, { ok: false, message: 'Profissional responsável é obrigatório' });
});

test('requires a reason for a selected test not completed', () => {
  const result = validateAssessmentDraft({
    ...validAssessment,
    results: [{ testId: 'step-2min', status: 'naoConcluido', reason: '', attempts: [] }]
  });
  assert.deepEqual(result, { ok: false, message: 'Informe o motivo do teste não concluído' });
});

test('accepts a complete assessment draft', () => {
  assert.deepEqual(validateAssessmentDraft(validAssessment), { ok: true });
});
