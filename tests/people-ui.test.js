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

test('assessment and history use the ready state and grouped existing timeline', () => {
  assert.match(source, /data-selection-ready/);
  assert.match(source, /groupHistoryByMonth/);
  assert.match(source, /history-timeline/);
});
