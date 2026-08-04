import assert from 'node:assert/strict';
import test from 'node:test';
import { historySummaryFromApi } from '../web/js/sync-model.js';

test('converts compact summary rows into data ready for the history timeline', () => {
  assert.deepEqual(historySummaryFromApi({
    avaliacaoId: 'a1', pessoaId: 'p1', data: '2026-08-04', profissionalNome: 'Elohim', status: 'concluida',
    testesSelecionados: '["step-2min"]',
    resultadosResumoJson: '[{"testeId":"step-2min","status":"concluido","lado":"","valorOficial":"86","unidade":"elevações"}]'
  }), {
    assessment: { id: 'a1', personId: 'p1', date: '2026-08-04', professionalName: 'Elohim', status: 'concluida', testIds: ['step-2min'] },
    results: [{ testId: 'step-2min', status: 'concluido', unit: 'elevações', attempts: [], officialBySide: { unico: 86 }, reason: '' }]
  });
});
