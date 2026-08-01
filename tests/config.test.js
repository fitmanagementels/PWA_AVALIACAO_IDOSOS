import assert from 'node:assert/strict';
import test from 'node:test';
import { ASSESSMENT_STATUS, RESULT_STATUS, SHEETS } from '../shared/config.js';

test('declares the persistent entities and valid statuses', () => {
  assert.deepEqual(ASSESSMENT_STATUS, ['rascunho', 'pendenteDeSincronizacao', 'concluida']);
  assert.deepEqual(RESULT_STATUS, ['concluido', 'naoConcluido']);
  assert.deepEqual(Object.values(SHEETS), [
    'Pessoas',
    'Profissionais',
    'Avaliacoes',
    'Resultados',
    'Tentativas',
    'CatalogoTestes',
    'Referencias',
    'Protocolos'
  ]);
});
