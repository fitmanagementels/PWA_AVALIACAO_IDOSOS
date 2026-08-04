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
