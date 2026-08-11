import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('uses the active public Web App endpoint for the GitHub Pages PWA', () => {
  const source = fs.readFileSync('web/config.js', 'utf8');
  assert.match(source, /AKfycbxiOh-9A6XTTSnzL-ViJ7DP-cvckZI6njaE0bE7V18F_fkfT9ZFxHAk8FefgKF8eTngDQ/);
});
