import assert from 'node:assert/strict';
import test from 'node:test';
import { createMutationQueue } from '../web/js/storage.js';
import { assessmentReadiness } from '../web/js/assessment-domain.js';

function memoryStore() {
  const values = new Map();
  return {
    async getAll() { return [...values.values()]; },
    async put(value) { values.set(value.id, value); },
    async remove(id) { values.delete(id); }
  };
}

test('keeps only the newest pending mutation for one assessment', async () => {
  const queue = createMutationQueue(memoryStore());
  await queue.enqueueAssessment({ assessmentId: 'a1', action: 'saveAssessment', payload: { revision: 1 } });
  await queue.enqueueAssessment({ assessmentId: 'a1', action: 'saveAssessment', payload: { revision: 2 } });

  assert.deepEqual(await queue.list(), [{
    id: 'assessment:a1', assessmentId: 'a1', action: 'saveAssessment', payload: { revision: 2 }
  }]);
});

test('blocks completion when a selected test has no result', () => {
  assert.deepEqual(assessmentReadiness({ testIds: ['step-2min'], results: [] }), {
    ready: false,
    message: 'Preencha ou informe o motivo para todos os testes selecionados'
  });
});

test('blocks completion when a non-completed test has no reason', () => {
  assert.deepEqual(assessmentReadiness({
    testIds: ['step-2min'],
    results: [{ testId: 'step-2min', status: 'naoConcluido', reason: ' ' }]
  }), { ready: false, message: 'Informe o motivo do teste não concluído' });
});
