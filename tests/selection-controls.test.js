import assert from 'node:assert/strict';
import test from 'node:test';
import { selectionCardsMarkup, selectionSummary } from '../web/js/views/selection-controls.js';

test('renders selected cards without changing checkbox names or values', () => {
  const markup = selectionCardsMarkup({
    name: 'testIds',
    items: [['sppb', 'SPPB'], ['step-2min', '2-Minute Step Test']],
    selectedIds: ['sppb']
  });

  assert.match(markup, /class="selection-card"/);
  assert.match(markup, /name="testIds" value="sppb" checked/);
  assert.match(markup, /name="testIds" value="step-2min"/);
});

test('creates singular, plural and empty selection copy', () => {
  assert.deepEqual(selectionSummary(0, 'Iniciar avaliação'), { count: 'Nenhum teste selecionado', action: 'Iniciar avaliação' });
  assert.deepEqual(selectionSummary(1, 'Gerar relatório PDF'), { count: '1 teste selecionado', action: 'Gerar relatório PDF · 1 teste' });
  assert.deepEqual(selectionSummary(3, 'Adicionar testes'), { count: '3 testes selecionados', action: 'Adicionar testes · 3 testes' });
});
