import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAttendanceItems } from '../web/js/views/attendance-center.js';

test('prioritizes the newest local draft without creating a clinical status', () => {
  const [item] = buildAttendanceItems(
    [{ id: 'p-1', name: 'Ana', sex: 'feminino' }],
    [
      { id: 'old', personId: 'p-1', status: 'rascunho', updatedAt: '2026-08-01T10:00:00Z' },
      { id: 'new', personId: 'p-1', status: 'rascunho', updatedAt: '2026-08-02T10:00:00Z' },
    ],
    { 'p-1': [{ assessmentId: 'saved', date: '2026-07-20', status: 'concluido' }] },
  );

  assert.equal(item.kind, 'draft');
  assert.equal(item.draft.id, 'new');
  assert.equal(item.history, null);
});

test('uses only the latest cached history when no local draft exists', () => {
  const [item] = buildAttendanceItems(
    [{ id: 'p-2', name: 'Bia' }],
    [],
    { 'p-2': [
      { assessmentId: 'older', date: '2026-06-10', status: 'concluido' },
      { assessmentId: 'latest', date: '2026-07-10', status: 'rascunho' },
    ] },
  );

  assert.equal(item.kind, 'history');
  assert.equal(item.history.assessmentId, 'latest');
});
