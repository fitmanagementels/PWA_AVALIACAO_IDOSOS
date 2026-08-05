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
