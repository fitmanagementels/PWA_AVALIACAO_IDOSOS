import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('web/js/views/assessment-editor.js', 'utf8');

test('renders compact test cards and opens the local detail sheet instead of expanded details', () => {
  assert.match(source, /class="test-summary-card"/);
  assert.match(source, /openTestSheet/);
  assert.match(source, /testCardSummary/);
  assert.doesNotMatch(source, /<details class="test-card"/);
});

test('keeps global save based on accumulated local test draft inputs', () => {
  assert.match(source, /draftInputs: assessment\.draftInputs/);
  assert.match(source, /replaceTestDraftInputs/);
  assert.match(source, /collectResult\(id, data\)/);
  assert.doesNotMatch(source, /request\(/);
});

test('restores focus to the rebuilt test card after closing its sheet', () => {
  assert.match(source, /root\.querySelector\(`\[data-open-test=/);
  assert.match(source, /replacement\?\.focus\(\)/);
});

test('offers adding tests and manual completion', () => {
  assert.match(source, /data-add-tests/);
  assert.match(source, /data-action="complete"/);
  assert.match(source, /assessmentReadiness/);
});

test('uses premium cards for added tests while the detail sheet owns non-completed toggles', () => {
  assert.match(source, /selectionCardsMarkup\(\{ name: 'additionalTestIds'/);
  assert.match(source, /data-selection-summary="additional"/);
  assert.match(source, /testFieldsMarkup/);
});
