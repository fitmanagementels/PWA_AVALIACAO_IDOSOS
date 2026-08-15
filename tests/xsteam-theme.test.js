import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('uses XSTEAM dark surface tokens and reserves lime for action and focus', () => {
  const css = fs.readFileSync('web/styles/app.css', 'utf8');
  assert.match(css, /--surface-base:/);
  assert.match(css, /--surface-card:/);
  assert.match(css, /--surface-active:/);
  assert.match(css, /--surface-overlay:/);
  assert.match(css, /#E2FF42/);
  assert.match(css, /prefers-reduced-motion/);
});

test('uses cobalto silencioso surfaces and a subtle original brand watermark', () => {
  const css = fs.readFileSync('web/styles/app.css', 'utf8');
  const html = fs.readFileSync('web/index.html', 'utf8');
  const manifest = fs.readFileSync('web/manifest.webmanifest', 'utf8');

  assert.match(css, /--surface-base:\s*#06080D/i);
  assert.match(css, /--surface-card:\s*#0E131D/i);
  assert.match(css, /--surface-elevated:\s*#192232/i);
  assert.match(css, /--surface-active:\s*#2A3850/i);
  assert.match(css, /--surface-overlay:\s*#05070C/i);
  assert.match(css, /--surface-field:\s*#090E15/i);
  assert.match(css, /xsteam-mark\.svg/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(html, /theme-color" content="#06080D"/i);
  assert.match(manifest, /"background_color": "#06080D"/i);
  assert.match(manifest, /"theme_color": "#06080D"/i);
  assert.match(css, /\.xsteam-select__options[\s\S]*var\(--surface-overlay\)/);
  assert.match(css, /\.test-sheet[\s\S]*var\(--surface-card\)/);
  assert.match(css, /\.attendance-card[\s\S]*linear-gradient/);
  assert.match(css, /\.test-summary-card[\s\S]*linear-gradient/);
  assert.match(css, /\.sync-dock[\s\S]*var\(--surface-overlay\)/);

  const reportCss = fs.readFileSync('web/styles/report.css', 'utf8');
  assert.match(reportCss, /linear-gradient\(125deg, #06080D, #192232\)/);
  assert.match(reportCss, /#E2FF42/);
});

test('styles premium selection cards and binary toggles accessibly', () => {
  const css = fs.readFileSync('web/styles/app.css', 'utf8');
  assert.match(css, /\.selection-card/);
  assert.match(css, /\.selection-card:has\(input:checked\)/);
  assert.match(css, /\.selection-toggle/);
  assert.match(css, /\.selection-input:focus-visible/);
  assert.match(css, /min-height:\s*52px/);
  assert.match(css, /@media \(max-width: 480px\)/);
});

test('styles XSTEAM menus as dark popovers and mobile bottom sheets', () => {
  const css = fs.readFileSync('web/styles/app.css', 'utf8');
  assert.match(css, /\.brand-lockup/);
  assert.match(css, /\.xsteam-select__trigger/);
  assert.match(css, /\.xsteam-select__options/);
  assert.match(css, /\.xsteam-select__layer\[hidden\]/);
  assert.match(css, /@media \(max-width: 600px\)/);
  assert.match(css, /min-height:\s*48px/);
  assert.match(css, /\.xsteam-select__trigger:focus-visible/);
  assert.match(css, /\.search-field input/);
});

test('styles the attendance center, timeline and ready session action responsively', () => {
  const css = fs.readFileSync('web/styles/app.css', 'utf8');
  assert.match(css, /\.attendance-hero/);
  assert.match(css, /\.attendance-card/);
  assert.match(css, /\.attendance-card__next-step/);
  assert.match(css, /\.history-timeline/);
  assert.match(css, /\.assessment-submit\[data-selection-ready="true"\]/);
  assert.match(css, /@media \(min-width: 760px\)/);
});

test('styles the contextual test sheet with a translucent scrim and responsive compact grids', () => {
  const css = fs.readFileSync('web/styles/app.css', 'utf8');
  assert.match(css, /\.test-summary-card/);
  assert.match(css, /\.test-sheet-layer/);
  assert.match(css, /\.test-sheet-scrim/);
  assert.match(css, /\.test-sheet__visual/);
  assert.match(css, /\.test-attempt-group/);
  assert.match(css, /@media \(min-width: 760px\)/);
  assert.match(css, /@media \(max-width: 759px\)/);
  assert.match(css, /min-height:\s*48px/);
});
