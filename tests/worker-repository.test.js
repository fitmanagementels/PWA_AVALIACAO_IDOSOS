import assert from 'node:assert/strict';
import test from 'node:test';
import { getCatalog, getPersonHistory, removeAssessmentTest, saveAssessment } from '../worker/src/repository.js';

function recordingDb() {
  const sql = [];
  return {
    sql,
    prepare(statement) {
      sql.push(statement);
      return { bind: (...values) => ({ statement, values }) };
    },
    async batch(statements) {
      sql.push(...statements.map(({ statement }) => statement));
      return [];
    },
  };
}

function fakeDb(rows) {
  return {
    prepare(statement) {
      return {
        bind: () => ({
          all: async () => ({ results: statement.includes('FROM assessments') ? rows : [] }),
        }),
      };
    },
  };
}

const assessmentPayload = {
  id: 'assessment-1', personId: 'person-1', assessmentDate: '2026-08-26', professionalId: 'professional-elohim',
  testIds: ['step-2min'], testNotes: '', studentObservations: '', createdAt: '2026-08-26T12:00:00.000Z',
  results: [{
    id: 'result-1', testId: 'step-2min', status: 'concluido', side: '', officialValue: 88, unit: 'contagem',
    attempts: [{ id: 'attempt-1', ordinal: 1, side: '', value: 88, unit: 'contagem', valid: true }],
  }],
};

test('grava avaliação repetida sem duplicar tentativas', async () => {
  const db = recordingDb();
  await saveAssessment(db, assessmentPayload, { complete: false, now: '2026-08-26T12:00:00.000Z' });
  const statements = db.sql.join('\n');

  assert.match(statements, /INSERT INTO assessments/);
  assert.match(statements, /INSERT INTO attempts/);
  assert.match(statements, /ON CONFLICT\(id\) DO UPDATE/);
  assert.match(statements, /DELETE FROM attempts WHERE result_id = \?/);
});

test('lista histórico apenas da pessoa solicitada em ordem decrescente', async () => {
  const history = await getPersonHistory(fakeDb([
    { id: 'a-2', person_id: 'person-1', assessment_date: '2026-08-02', professional_name: 'Elohim', updated_at: '2026-08-02T10:00:00.000Z' },
    { id: 'a-1', person_id: 'person-1', assessment_date: '2026-08-01', professional_name: 'Victor', updated_at: '2026-08-01T10:00:00.000Z' },
  ]), 'person-1');

  assert.deepEqual(history.map((item) => item.assessment.id), ['a-2', 'a-1']);
  assert.equal(history[0].assessment.professionalName, 'Elohim');
});

test('remove um teste apenas de avaliação ainda editável', async () => {
  const executed = [];
  const db = {
    prepare(sql) {
      return {
        bind: () => ({
          first: async () => ({ status: 'rascunho' }),
          run: async () => { executed.push(sql); },
        }),
      };
    },
  };
  await removeAssessmentTest(db, 'assessment-1', 'sppb');
  assert.match(executed.join('\n'), /DELETE FROM assessment_tests/);
  assert.match(executed.join('\n'), /DELETE FROM results/);
});

test('retorna catálogo sem fazer parsing de referências clínicas no cliente', async () => {
  const db = {
    prepare(sql) {
      return {
        all: async () => ({ results: sql.includes('catalog_tests') ? [{ id: 'sppb', name: 'SPPB', domain: 'Multicomponente', unit: 'score', configuration_json: '{"bundle":true}' }] : [] }),
      };
    },
  };
  const catalog = await getCatalog(db);
  assert.deepEqual(catalog.tests, [{ id: 'sppb', name: 'SPPB', domain: 'Multicomponente', unit: 'score', configuration: { bundle: true } }]);
});
