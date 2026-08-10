import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('report preview is an independent view with native print and a back action', () => {
  const source = fs.readFileSync('web/js/views/report-preview.js', 'utf8');

  assert.match(source, /export function renderReportPreview/);
  assert.match(source, /window\.print\(\)/);
  assert.match(source, /data-report-back/);
  assert.match(source, /data-report-print/);
});

test('print stylesheet defines adaptive A5 output and hides PWA controls', () => {
  const css = fs.readFileSync('web/styles/report.css', 'utf8');

  assert.match(css, /@page\s*\{\s*size:\s*A5 portrait/);
  assert.match(css, /@media print/);
  assert.match(css, /break-inside:\s*avoid/);
  assert.match(css, /\.app-header[\s\S]*\.sync-dock[\s\S]*\.report-preview-actions/);
});

test('preview omits absent classification labels and names ordered attempts', () => {
  const source = fs.readFileSync('web/js/views/report-preview.js', 'utf8');

  assert.match(source, /test\.classification \?/);
  assert.match(source, /attempt\.order/);
  assert.match(source, /D = direita/);
});

test('print CSS lets sections flow while preserving individual cards', () => {
  const css = fs.readFileSync('web/styles/report.css', 'utf8');

  assert.doesNotMatch(css, /\.report-summary\s*\{\s*break-after:\s*page/);
  assert.doesNotMatch(css, /\.report-domain\s*\{[^}]*break-inside:\s*avoid/);
  assert.match(css, /\.report-technical-card[^}]*break-inside:\s*avoid/);
});
