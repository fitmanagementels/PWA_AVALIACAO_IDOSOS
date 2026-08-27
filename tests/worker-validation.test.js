import assert from 'node:assert/strict';
import test from 'node:test';
import { validateCompletion, validatePersonInput } from '../worker/src/validation.js';

test('recusa pessoa sem os campos mínimos exigidos', () => {
  assert.throws(() => validatePersonInput({ fullName: '', birthDate: '', sex: '' }), /Nome, data de nascimento e sexo são obrigatórios/);
});

test('recusa conclusão sem resultado ou motivo para teste selecionado', () => {
  assert.throws(() => validateCompletion({ selectedTestIds: ['sppb'], results: [] }), /Preencha ou informe o motivo para todos os testes selecionados/);
  assert.throws(() => validateCompletion({
    selectedTestIds: ['sppb'],
    results: [{ testId: 'sppb', status: 'naoConcluido', reason: '' }],
  }), /Informe o motivo do teste não concluído/);
});

test('aceita teste concluído ou não concluído com motivo', () => {
  assert.doesNotThrow(() => validateCompletion({
    selectedTestIds: ['sppb'],
    results: [{ testId: 'sppb', status: 'naoConcluido', reason: 'Dor no joelho' }],
  }));
});
