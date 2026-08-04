import assert from 'node:assert/strict';
import test from 'node:test';
import { flushQueue } from '../web/js/sync-status.js';

function memoryQueue(items) {
  const values = new Map(items.map((item) => [item.id, item]));
  return {
    async list() { return [...values.values()]; },
    async remove(id) { values.delete(id); },
    async clearFailure(id) { const item = values.get(id); if (item) delete item.lastError; },
    async markFailed(id, message) { const item = values.get(id); values.set(id, { ...item, lastError: message }); }
  };
}

test('reports the API error and keeps the failed operation pending', async () => {
  const queue = memoryQueue([{ id: 'm1', action: 'saveAssessment', payload: {} }]);

  const result = await flushQueue(queue, async () => {
    throw new Error('Profissional responsável é obrigatório');
  });

  assert.equal(result.ok, false);
  assert.equal(result.phase, 'error');
  assert.equal(result.message, 'Profissional responsável é obrigatório');
  assert.equal(result.pendingCount, 1);
  assert.equal((await queue.list())[0].lastError, 'Profissional responsável é obrigatório');
});

test('removes confirmed mutations and reports an empty queue', async () => {
  const queue = memoryQueue([{ id: 'm1', action: 'saveAssessment', payload: {} }]);

  const result = await flushQueue(queue, async () => ({ ok: true }));

  assert.deepEqual(result, { ok: true, phase: 'synced', pendingCount: 0, message: 'Tudo sincronizado', items: [] });
});
