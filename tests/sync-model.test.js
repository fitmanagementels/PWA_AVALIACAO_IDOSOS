import assert from 'node:assert/strict';
import test from 'node:test';
import { assessmentForCreate, assessmentForSave, measurementValue, personForSave } from '../web/js/sync-model.js';

test('does not turn an empty measurement field into zero', () => {
  assert.equal(measurementValue(''), null);
  assert.equal(measurementValue('  '), null);
  assert.equal(measurementValue('12,5'), 12.5);
});

test('maps a local person to the Apps Script contract', () => {
  assert.deepEqual(personForSave({ id: 'p-1', name: 'Maria', birthDate: '1950-01-01', sex: 'feminino', whatsapp: '5585999999999' }), {
    pessoaId: 'p-1', nomeCompleto: 'Maria', dataNascimento: '1950-01-01', sexo: 'feminino', whatsApp: '5585999999999'
  });
});

test('keeps the local assessment id when creating an assessment offline', () => {
  assert.equal(assessmentForCreate({ id: 'a-1', personId: 'p-1', date: '2026-08-01', professionalName: 'Elohim', testIds: ['sppb'] }).avaliacaoId, 'a-1');
});

test('splits bilateral official values into individual result records', () => {
  const payload = assessmentForSave({
    id: 'a-1', personId: 'p-1', date: '2026-08-01', professionalName: 'Elohim', testIds: ['knee-extension-isometric'], results: [{
      testId: 'knee-extension-isometric', status: 'concluido', unit: 'kgf',
      attempts: [{ side: 'direito', value: 20 }, { side: 'direito', value: 24 }, { side: 'esquerdo', value: 18 }],
      officialBySide: { direito: 24, esquerdo: 18 }
    }], testNotes: 'interno', studentObservations: 'boa tolerância'
  });
  assert.deepEqual(payload.resultados.map(({ testeId, lado, valorOficial, unidade }) => ({ testeId, lado, valorOficial, unidade })), [
    { testeId: 'knee-extension-isometric', lado: 'direito', valorOficial: 24, unidade: 'kgf' },
    { testeId: 'knee-extension-isometric', lado: 'esquerdo', valorOficial: 18, unidade: 'kgf' }
  ]);
});
