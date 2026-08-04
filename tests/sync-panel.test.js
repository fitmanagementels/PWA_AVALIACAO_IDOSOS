import assert from 'node:assert/strict';
import test from 'node:test';
import { syncPanelMarkup } from '../web/js/views/sync-panel.js';

test('renders retry action and safe metadata for a failed sync item', () => {
  const markup = syncPanelMarkup({
    phase: 'error', pendingCount: 1,
    message: 'Profissional responsável é obrigatório',
    items: [{ action: 'saveAssessment', queuedAt: '2026-08-04T12:00:00.000Z', lastError: 'Profissional responsável é obrigatório' }]
  });
  assert.match(markup, /Tentar novamente/);
  assert.match(markup, /Profissional responsável é obrigatório/);
  assert.doesNotMatch(markup, /valorOficial|tentativas/);
});

test('escapes a backend error message before rendering it in the dock', () => {
  const markup = syncPanelMarkup({
    phase: 'error', pendingCount: 1,
    message: '<img src=x onerror=alert(1)>',
    items: [{ action: 'saveAssessment', lastError: '<script>alert(1)</script>' }]
  });

  assert.doesNotMatch(markup, /<img|<script>/);
  assert.match(markup, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(markup, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});
