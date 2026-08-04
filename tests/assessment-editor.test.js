import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('web/js/views/assessment-editor.js', 'utf8');

test('renders tests as closed details cards and persists draft inputs', () => {
  assert.match(source, /<details class="test-card"/);
  assert.match(source, /draftInputs/);
  assert.match(source, /saveDraft\(assessment\)/);
});

test('offers adding tests and manual completion', () => {
  assert.match(source, /data-add-tests/);
  assert.match(source, /data-action="complete"/);
  assert.match(source, /assessmentReadiness/);
});
