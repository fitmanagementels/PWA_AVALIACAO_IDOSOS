import assert from 'node:assert/strict';
import test from 'node:test';
import { historyTimeline } from '../web/js/views/history.js';

test('creates chronological history items without comparison deltas', () => {
  const items = historyTimeline([{ assessment: { id: 'a1', date: '2026-08-01', professionalName: 'Elohim', status: 'concluida' }, results: [] }], {});
  assert.deepEqual(items, [{ assessmentId: 'a1', date: '2026-08-01', professionalName: 'Elohim', status: 'concluida', testIds: [], colors: { green: 0, yellow: 0, gray: 0, pending: 0 } }]);
});
