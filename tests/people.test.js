import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { buildAssessmentStart, whatsAppUrl } from '../web/js/domain.js';

test('creates a WhatsApp link only for a normalized number', () => {
  assert.equal(whatsAppUrl('5585999999999'), 'https://wa.me/5585999999999');
  assert.equal(whatsAppUrl(''), null);
});

test('starts an assessment with selected tests and a fixed professional', () => {
  assert.deepEqual(buildAssessmentStart({
    personId: 'p1',
    professionalName: 'Elohim',
    testIds: ['sppb', 'step-2min']
  }), {
    personId: 'p1',
    professionalName: 'Elohim',
    testIds: ['sppb', 'step-2min']
  });
});

test('uses premium selection controls for the new assessment and PDF report', () => {
  const source = fs.readFileSync('web/js/views/people.js', 'utf8');
  assert.match(source, /selectionCardsMarkup/);
  assert.match(source, /bindSelectionSummary/);
  assert.match(source, /data-selection-summary="start"/);
  assert.match(source, /data-selection-summary="report"/);
  assert.match(source, /data-selection-action="report"/);
});

test('opens the local adaptive preview rather than the legacy report endpoint', () => {
  const source = fs.readFileSync('web/js/views/people.js', 'utf8');

  assert.match(source, /renderReportPreview/);
  assert.match(source, /hasPendingAssessmentMutation/);
  assert.doesNotMatch(source, /request\('generateReport'/);
});

test('builds the report selection only from concluded result identifiers', () => {
  const source = fs.readFileSync('web/js/views/people.js', 'utf8');

  assert.match(source, /const selectedItems = selected\.map\(\(id\) => \[id, testName\(id\)\]\);/);
});

test('uses the reusable XSTEAM select for sex, professional and history filter', () => {
  const source = fs.readFileSync('web/js/views/people.js', 'utf8');
  assert.match(source, /xsteamSelectMarkup/);
  assert.match(source, /name: 'sex'/);
  assert.match(source, /name: 'professionalName'/);
  assert.match(source, /dataAttribute: 'data-history-test'/);
  assert.doesNotMatch(source, /<select name="sex"/);
  assert.doesNotMatch(source, /<select name="professionalName"/);
});

test('returns to the history list with the active filter after opening an assessment', () => {
  const source = fs.readFileSync('web/js/views/people.js', 'utf8');
  assert.match(source, /const returnToHistory = \(message = ''\) => \{[\s\S]*renderHistoryList\(root, person, assessments, subtitle, selectedTestId\)/);
  assert.match(source, /renderAssessmentHistory\(root, person, button\.dataset\.assessmentId, returnToHistory\)/);
});

test('does not treat the detail back button click event as a history message', () => {
  const source = fs.readFileSync('web/js/views/people.js', 'utf8');

  assert.match(source, /root\.querySelector\('\[data-back\]'\)\.onclick = \(\) => onBack\(\);/);
});
