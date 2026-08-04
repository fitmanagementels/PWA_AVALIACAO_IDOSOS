import assert from 'node:assert/strict';
import test from 'node:test';
import { createMutationQueue } from '../web/js/storage.js';

function memoryStore() {
  const values = new Map();
  return {
    async getAll() { return [...values.values()]; },
    async put(value) { values.set(value.id, value); },
    async remove(id) { values.delete(id); }
  };
}

test('keeps a mutation until the server confirms it', async () => {
  const queue = createMutationQueue(memoryStore());
  await queue.enqueue({ id: 'm1', action: 'saveAssessment', payload: { assessmentId: 'a1' } });
  await queue.flush(async () => ({ ok: false, error: { code: 'NETWORK_ERROR' } }));
  assert.equal((await queue.list()).length, 1);
  await queue.flush(async () => ({ ok: true, data: {} }));
  assert.equal((await queue.list()).length, 0);
});

test('keeps a failed mutation with the retry message', async () => {
  const queue = createMutationQueue(memoryStore());
  await queue.enqueue({ id: 'm1', action: 'saveAssessment', payload: {} });

  await queue.markFailed('m1', 'Profissional responsável é obrigatório');

  const [item] = await queue.list();
  assert.equal(item.id, 'm1');
  assert.equal(item.lastError, 'Profissional responsável é obrigatório');
  assert.ok(Number.isFinite(Date.parse(item.queuedAt)));
  assert.ok(Number.isFinite(Date.parse(item.lastAttemptAt)));
});
