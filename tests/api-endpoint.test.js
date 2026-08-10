import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('uses the active public Web App endpoint for the GitHub Pages PWA', () => {
  const source = fs.readFileSync('web/config.js', 'utf8');
  assert.match(source, /AKfycbybACMhUIMu3Z5-hJKZdSDErw2sQamH-KpF5kfl7L1-8C8DtIir7n1EvtDhNzyJrmiuDw/);
});
