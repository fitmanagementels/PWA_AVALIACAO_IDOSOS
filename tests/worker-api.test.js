import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorker } from '../worker/src/index.js';

const env = { ALLOWED_ORIGIN: 'https://avaliacao.pages.dev' };
const apiRequest = (path, options = {}) => new Request(`https://api.example${path}`, {
  headers: { Origin: env.ALLOWED_ORIGIN, ...(options.headers || {}) }, ...options,
});

test('retorna pessoas e meta da identidade autenticada', async () => {
  const worker = createWorker({
    authenticate: async () => ({ email: 'elo@xsteam.com', subject: '1' }),
    listPeople: async () => [{ id: 'p1' }],
  });
  const response = await worker.fetch(apiRequest('/api/people'), env);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.meta.user.email, 'elo@xsteam.com');
  assert.deepEqual(body.data, [{ id: 'p1' }]);
});

test('encaminha remoção de teste apenas para rota DELETE exata', async () => {
  const removed = [];
  const worker = createWorker({
    authenticate: async () => ({ email: 'elo@xsteam.com', subject: '1' }),
    removeAssessmentTest: async (_db, assessmentId, testId) => { removed.push({ assessmentId, testId }); return { ok: true }; },
  });
  const response = await worker.fetch(apiRequest('/api/assessments/a1/tests/sppb', { method: 'DELETE' }), env);
  assert.equal(response.status, 200);
  assert.deepEqual(removed, [{ assessmentId: 'a1', testId: 'sppb' }]);
});

test('salva pessoa pelo endpoint REST com corpo JSON limitado', async () => {
  const saved = [];
  const worker = createWorker({
    authenticate: async () => ({ email: 'elo@xsteam.com', subject: '1' }),
    savePerson: async (_db, person) => { saved.push(person); return { ...person, id: 'p1' }; },
  });
  const response = await worker.fetch(apiRequest('/api/people', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName: 'Maria', birthDate: '1954-08-02', sex: 'feminino' }),
  }), env);
  assert.equal(response.status, 200);
  assert.equal(saved[0].fullName, 'Maria');
});

test('conclui uma avaliação apenas pelo endpoint POST específico', async () => {
  const completed = [];
  const worker = createWorker({
    authenticate: async () => ({ email: 'elo@xsteam.com', subject: '1' }),
    saveAssessment: async (_db, input, options) => { completed.push({ input, options }); return { assessmentId: 'a1', status: 'concluida' }; },
  });
  const response = await worker.fetch(apiRequest('/api/assessments/a1/complete', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'a1', personId: 'p1', assessmentDate: '2026-08-27', professionalId: 'professional-elohim', testIds: ['sppb'], results: [{ testId: 'sppb', status: 'naoConcluido', reason: 'Dor' }] }),
  }), env);
  assert.equal(response.status, 200);
  assert.equal(completed[0].options.complete, true);
});
