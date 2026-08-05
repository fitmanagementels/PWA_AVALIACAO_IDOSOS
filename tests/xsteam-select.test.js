import assert from 'node:assert/strict';
import test from 'node:test';
import { xsteamSelectMarkup } from '../web/js/views/xsteam-select.js';

test('renders one hidden field that preserves the form name and current value', () => {
  const markup = xsteamSelectMarkup({
    id: 'professional',
    name: 'professionalName',
    label: 'Profissional',
    options: [['', 'Selecione'], ['Elohim', 'Elohim']],
    value: 'Elohim',
    required: true
  });

  assert.match(markup, /type="hidden" name="professionalName" value="Elohim"/);
  assert.match(markup, /aria-haspopup="listbox"/);
  assert.match(markup, /role="listbox"/);
  assert.match(markup, /role="option"[^>]*aria-selected="true"/);
});
