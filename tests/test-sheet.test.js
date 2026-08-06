import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { testSheetMarkup } from '../web/js/views/test-sheet.js';

test('renders an accessible sheet with a left visual placeholder and compact save action', () => {
  const markup = testSheetMarkup({
    testId: 'back-scratch',
    definition: { title: 'Back Scratch', unit: 'cm', hint: 'Registre a melhor distância em cm para cada lado.' },
    fields: '<label>Tentativa 1<input name="back-scratch-direito-1"></label>',
    summary: { text: 'Nenhuma tentativa' },
  });

  assert.match(markup, /role="dialog"/);
  assert.match(markup, /aria-modal="true"/);
  assert.match(markup, /test-sheet__visual/);
  assert.match(markup, /Imagem de referência/);
  assert.match(markup, /test-sheet__procedure/);
  assert.match(markup, /data-test-sheet-save/);
});

test('keeps the sheet isolated from remote APIs and queue operations', async () => {
  const source = await readFile('web/js/views/test-sheet.js', 'utf8');
  assert.doesNotMatch(source, /api-client|enqueueAssessmentMutation|queueMutation|request\(/);
  assert.match(source, /origin\.focus\(\)/);
  assert.match(source, /event\.key === 'Escape'/);
  assert.match(source, /catch\(\(\) => undefined\)/);
  assert.match(source, /document\.removeEventListener\('keydown', trapFocus\)/);
  assert.doesNotMatch(source, /replaceWith\(/);
});

test('uses the existing SPPB form field names in dedicated compact groups', async () => {
  const source = await readFile('web/js/views/test-sheet.js', 'utf8');
  for (const name of ['sppb-gait-1', 'sppb-gait-2', 'sppb-chair', 'sppb-feet', 'sppb-semi', 'sppb-tandem']) {
    assert.match(source, new RegExp(name));
  }
  assert.match(source, /compact-number-field/);
  assert.match(source, /data-not-completed/);
});
