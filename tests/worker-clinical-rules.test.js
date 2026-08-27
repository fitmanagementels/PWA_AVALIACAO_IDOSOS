import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ageOnDate,
  bestAttempt,
  referenceApplicationForValue,
  referenceForSavedResult,
} from '../worker/src/clinical-rules.js';

const person = { sex: 'feminino', birthDate: '1954-08-02' };
const criteria = {
  modelo: 'faixas-por-sexo-e-idade',
  unidade: 'cm',
  fonte: 'Fonte clínica',
  rotulos: { abaixo: 'Abaixo do esperado', normal: 'Dentro do esperado', acima: 'Acima do esperado' },
  faixas: [{ sexo: 'feminino', idadeMin: 70, idadeMax: 74, normalMin: -14, normalMax: 0 }],
};
const referenceV1 = {
  id: 'ref-back-scratch-v1',
  testId: 'back-scratch',
  version: 1,
  criteriaJson: JSON.stringify(criteria),
  effectiveOn: '2026-01-01',
};
const referenceV2 = {
  ...referenceV1,
  id: 'ref-back-scratch-v2',
  version: 2,
  criteriaJson: JSON.stringify({
    ...criteria,
    faixas: [{ sexo: 'feminino', idadeMin: 70, idadeMax: 74, normalMin: -8, normalMax: 4 }],
  }),
  effectiveOn: '2026-08-01',
};

test('calcula idade e melhor tentativa com a direção do teste', () => {
  assert.equal(ageOnDate('1954-08-02', '2026-08-01'), 71);
  assert.equal(bestAttempt([6.2, 5.8], 'lowest'), 5.8);
  assert.equal(bestAttempt([20, 18], 'highest'), 20);
});

test('aplica referência por sexo e idade na data da avaliação', () => {
  const application = referenceApplicationForValue([referenceV1], {
    testId: 'back-scratch', sex: 'feminino', age: 72, value: -15, unit: 'cm', assessmentDate: '2026-08-10',
  });

  assert.equal(application.referenceId, 'ref-back-scratch-v1');
  assert.equal(application.classification, 'Abaixo do esperado');
  assert.deepEqual(application.range, { min: -14, max: 0, unit: 'cm' });
});

test('mantém a faixa já aplicada ao editar resultado antigo', () => {
  const original = referenceApplicationForValue([referenceV1], {
    testId: 'back-scratch', sex: 'feminino', age: 72, value: -14, unit: 'cm', assessmentDate: '2026-08-10',
  });
  const edited = referenceForSavedResult({
    status: 'concluido', testId: 'back-scratch', officialValue: 0, unit: 'cm', referenceApplicationJson: JSON.stringify(original),
  }, person, '2026-08-10', [referenceV2]);

  assert.equal(edited.referenceId, 'ref-back-scratch-v1');
  assert.deepEqual(edited.range, { min: -14, max: 0, unit: 'cm' });
  assert.equal(edited.classification, 'Dentro do esperado');
});
