import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../web/js/views/people.js', import.meta.url), 'utf8');

test('people route is the central de atendimentos with search and creation actions', () => {
  assert.match(source, /CENTRAL DE ATENDIMENTOS/);
  assert.match(source, /Buscar pessoa/);
  assert.match(source, /Nova pessoa/);
});

test('central derives local summaries while retaining the people navigation token', () => {
  assert.match(source, /buildAttendanceItems/);
  assert.match(source, /startNavigation\('people'\)/);
  assert.match(source, /data-resume-id/);
});

test('renders each attendance as a separated operational card', () => {
  assert.match(source, /class="attendance-card"/);
  assert.match(source, /attendance-card__identity/);
  assert.match(source, /attendance-card__next-step/);
  assert.doesNotMatch(source, /class="attendance-row"/);
});

test('shows current age instead of birth date outside the profile editor', () => {
  assert.match(source, /ageInYears/);
  assert.match(source, /\$\{ageInYears\(person\.birthDate\)\} anos/);
  assert.doesNotMatch(source, /const profile = `\$\{formatDateBr\(person\.birthDate\)\}/);
  assert.doesNotMatch(source, /<p>\$\{formatDateBr\(person\.birthDate\)\}/);
});

test('prevents a silent second draft and offers an explicit archive path', () => {
  assert.match(source, /function startAssessmentFlow\(/);
  assert.match(source, /function renderActiveDraftNotice\(/);
  assert.match(source, /archiveAssessment/);
  assert.match(source, /Retomar avaliação em andamento/);
});

test('offers a discreet archived drafts area with confirmed permanent deletion', () => {
  assert.match(source, /data-archived-drafts/);
  assert.match(source, /renderArchivedDrafts/);
  assert.match(source, /request\('listArchivedDrafts', \{\}, 'GET'\)/);
  assert.match(source, /queueMutation\('deleteArchivedAssessment'/);
  assert.match(source, /window\.confirm\('Apagar permanentemente este rascunho arquivado\?/);
});

test('assessment and history use the ready state and grouped existing timeline', () => {
  assert.match(source, /data-selection-ready/);
  assert.match(source, /groupHistoryByMonth/);
  assert.match(source, /history-timeline/);
});
