import assert from 'node:assert/strict';
import test from 'node:test';
import { groupHistoryByMonth, historyTimeline } from '../web/js/views/history.js';

test('creates chronological history items without comparison deltas', () => {
  const items = historyTimeline([{ assessment: { id: 'a1', date: '2026-08-01', professionalName: 'Elohim', status: 'concluida' }, results: [] }], {});
  assert.deepEqual(items, [{ assessmentId: 'a1', date: '2026-08-01', professionalName: 'Elohim', status: 'concluida', testIds: [], colors: { green: 0, yellow: 0, gray: 0, pending: 0 } }]);
});

test('groups an already sorted history by visible month without changing chronology', () => {
  const groups = groupHistoryByMonth([
    { assessmentId: 'a', date: '2026-08-04' },
    { assessmentId: 'b', date: '2026-08-01' },
    { assessmentId: 'c', date: '2026-07-31' },
  ]);

  assert.deepEqual(groups.map((group) => group.key), ['2026-08', '2026-07']);
  assert.deepEqual(groups[0].items.map((item) => item.assessmentId), ['a', 'b']);
});
