import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

function backendHelper(name) {
  const source = fs.readdirSync('apps-script')
    .filter((file) => file.endsWith('.gs'))
    .map((file) => fs.readFileSync(`apps-script/${file}`, 'utf8'))
    .join('\n');
  return new Function(`${source}\nreturn ${name};`)();
}

const BACK_SCRATCH_CRITERIA = {
  modelo: 'faixas-por-sexo-e-idade',
  unidade: 'cm',
  aplicarPorLado: true,
  rotulos: { abaixo: 'Abaixo da média', normal: 'Normal', acima: 'Acima da média' },
  faixas: [
    { sexo: 'masculino', idadeMin: 60, idadeMax: 64, normalMin: -16.5, normalMax: 0 },
    { sexo: 'masculino', idadeMin: 65, idadeMax: 69, normalMin: -19.1, normalMax: -2.5 },
    { sexo: 'masculino', idadeMin: 70, idadeMax: 74, normalMin: -20.3, normalMax: -2.5 },
    { sexo: 'masculino', idadeMin: 75, idadeMax: 79, normalMin: -22.9, normalMax: -5.1 },
    { sexo: 'masculino', idadeMin: 80, idadeMax: 84, normalMin: -24.1, normalMax: -5.1 },
    { sexo: 'masculino', idadeMin: 85, idadeMax: 89, normalMin: -25.4, normalMax: -7.6 },
    { sexo: 'masculino', idadeMin: 90, idadeMax: 94, normalMin: -26.7, normalMax: -10.2 },
    { sexo: 'feminino', idadeMin: 60, idadeMax: 64, normalMin: -7.6, normalMax: 3.8 },
    { sexo: 'feminino', idadeMin: 65, idadeMax: 69, normalMin: -8.9, normalMax: 3.8 },
    { sexo: 'feminino', idadeMin: 70, idadeMax: 74, normalMin: -10.2, normalMax: 2.5 },
    { sexo: 'feminino', idadeMin: 75, idadeMax: 79, normalMin: -12.7, normalMax: 1.3 },
    { sexo: 'feminino', idadeMin: 80, idadeMax: 84, normalMin: -14, normalMax: 0 },
    { sexo: 'feminino', idadeMin: 85, idadeMax: 89, normalMin: -17.8, normalMax: -2.5 },
    { sexo: 'feminino', idadeMin: 90, idadeMax: 94, normalMin: -20.3, normalMax: -2.5 }
  ],
  fonte: 'Tabela de referência fornecida pelo responsável do projeto em 10/08/2026'
};

function backScratchReferenceRow() {
  return {
    referenciaId: 'ref-back-scratch-v1',
    testeId: 'back-scratch',
    versao: 1,
    criteriosJson: JSON.stringify(BACK_SCRATCH_CRITERIA),
    classificacao: 'qualitativa-3-faixas',
    vigencia: '2026-08-10'
  };
}

test('keeps zero as a valid official result sent to Sheets', () => {
  const fieldOrBlank = backendHelper('fieldOrBlank_');
  assert.equal(fieldOrBlank(0), 0);
  assert.equal(fieldOrBlank(null), '');
});

test('classifies Back Scratch from the active sex and age reference', () => {
  const classifyReferenceValue = backendHelper('classifyReferenceValue_');
  const rows = [backScratchReferenceRow()];
  const input = (sex, age, value) => ({ testId: 'back-scratch', sex, age, value, unit: 'cm', assessmentDate: '2026-08-10' });

  assert.equal(classifyReferenceValue(rows, input('masculino', 60, -16.6)), 'Abaixo da média');
  assert.equal(classifyReferenceValue(rows, input('masculino', 60, -16.5)), 'Normal');
  assert.equal(classifyReferenceValue(rows, input('masculino', 60, 0)), 'Normal');
  assert.equal(classifyReferenceValue(rows, input('masculino', 60, 0.1)), 'Acima da média');
  assert.equal(classifyReferenceValue(rows, input('feminino', 80, -14)), 'Normal');
  assert.equal(classifyReferenceValue(rows, input('feminino', 80, 0.1)), 'Acima da média');
  assert.equal(classifyReferenceValue(rows, input('feminino', 95, -2)), null);
  assert.equal(classifyReferenceValue(rows, { ...input('feminino', 80, -2), unit: 'kgf' }), null);
});

test('uses the Back Scratch reference for each saved bilateral result', () => {
  const classificationForSavedResult = backendHelper('classificationForSavedResult_');
  const person = { sexo: 'feminino', dataNascimento: '1946-08-10' };
  const rows = [backScratchReferenceRow()];

  assert.equal(classificationForSavedResult({ testeId: 'back-scratch', status: 'concluido', valorOficial: -14, unidade: 'cm' }, person, '2026-08-10', rows), 'Normal');
  assert.equal(classificationForSavedResult({ testeId: 'back-scratch', status: 'concluido', valorOficial: 0.1, unidade: 'cm' }, person, '2026-08-10', rows), 'Acima da média');
  assert.equal(classificationForSavedResult({ testeId: 'back-scratch', status: 'naoConcluido', valorOficial: -14, unidade: 'cm', classificacao: 'preservar' }, person, '2026-08-10', rows), 'preservar');
});

test('builds the exact active Back Scratch reference record', () => {
  const record = backendHelper('backScratchReferenceRecord_')();
  const criteria = JSON.parse(record.criteriosJson);
  assert.deepEqual(
    { id: record.referenciaId, test: record.testeId, version: record.versao, kind: record.classificacao, start: record.vigencia },
    { id: 'ref-back-scratch-v1', test: 'back-scratch', version: 1, kind: 'qualitativa-3-faixas', start: '2026-08-10' }
  );
  assert.equal(criteria.faixas.length, 14);
  assert.deepEqual(criteria.faixas[0], { sexo: 'masculino', idadeMin: 60, idadeMax: 64, normalMin: -16.5, normalMax: 0 });
  assert.deepEqual(criteria.faixas.at(-1), { sexo: 'feminino', idadeMin: 90, idadeMax: 94, normalMin: -20.3, normalMax: -2.5 });
});

test('declares a compact history summary sheet for fast person lookups', () => {
  const source = fs.readFileSync('apps-script/00_Config.gs', 'utf8');
  assert.match(source, /HISTORY_SUMMARIES: 'HistoricoResumo'/);
  assert.match(source, /HistoricoResumo: \['resumoId', 'pessoaId', 'avaliacaoId'/);
  assert.match(source, /'resultadosResumoJson'/);
});

test('provides a server-side backfill for history summaries', () => {
  const source = fs.readFileSync('apps-script/04_Assessments.gs', 'utf8');
  assert.match(source, /function rebuildHistorySummaries\(\)/);
  assert.match(source, /const resultsByAssessment = getRows_\(SHEETS\.RESULTS\)/);
  assert.match(source, /updateHistorySummary_\(assessment, resultsByAssessment\[assessment\.avaliacaoId\] \|\| \[\]\)/);
  assert.doesNotMatch(source, /\|\|=/);
});

test('initializes the history summary before reading it', () => {
  const source = fs.readFileSync('apps-script/04_Assessments.gs', 'utf8');
  assert.match(source, /function getHistorySummary\(params\) \{ ensureHistorySummary_\(\);/);
  assert.match(source, /function ensureHistorySummary_\(\)/);
});

test('distinguishes an active draft from the latest completed assessment for one person', () => {
  const assessmentFlow = backendHelper('assessmentFlow_');
  const flow = assessmentFlow([
    { avaliacaoId: 'draft-old', pessoaId: 'p-1', data: '2026-08-01', profissionalNome: 'Ana', status: 'rascunho', ultimaAtualizacao: '2026-08-01T08:00:00Z' },
    { avaliacaoId: 'complete-new', pessoaId: 'p-1', data: '2026-08-04', profissionalNome: 'Ana', status: 'concluida', ultimaAtualizacao: '2026-08-04T10:00:00Z' },
    { avaliacaoId: 'archived', pessoaId: 'p-1', data: '2026-08-05', profissionalNome: 'Ana', status: 'arquivada', ultimaAtualizacao: '2026-08-05T10:00:00Z' },
  ], 'p-1');

  assert.deepEqual(flow.rascunhoAtivo, { avaliacaoId: 'draft-old', data: '2026-08-01', profissionalNome: 'Ana', status: 'rascunho', ultimaAtualizacao: '2026-08-01T08:00:00Z' });
  assert.deepEqual(flow.ultimaConcluida, { avaliacaoId: 'complete-new', data: '2026-08-04', profissionalNome: 'Ana', status: 'concluida', ultimaAtualizacao: '2026-08-04T10:00:00Z' });
});

test('declares archival and active-draft protection in the assessment API', () => {
  const config = fs.readFileSync('apps-script/00_Config.gs', 'utf8');
  const webApp = fs.readFileSync('apps-script/01_WebApp.gs', 'utf8');
  const assessments = fs.readFileSync('apps-script/04_Assessments.gs', 'utf8');

  assert.match(config, /'arquivada'/);
  assert.match(webApp, /getPersonFlow: getPersonFlow/);
  assert.match(webApp, /archiveAssessment: archiveAssessment/);
  assert.match(assessments, /ACTIVE_DRAFT_EXISTS/);
  assert.match(assessments, /function archiveAssessment\(payload\)/);
});

test('archives older active drafts when an assessment is concluded', () => {
  const assessments = fs.readFileSync('apps-script/04_Assessments.gs', 'utf8');

  assert.match(assessments, /function archiveOtherActiveDrafts_\(pessoaId, concludedAssessmentId\)/);
  assert.match(assessments, /assessment\.status === 'rascunho' \|\| assessment\.status === 'pendenteDeSincronizacao'/);
  assert.match(assessments, /archiveOtherActiveDrafts_\(assessment\.pessoaId, assessment\.avaliacaoId\)/);
});

test('declares guarded deletion of a test from an active assessment', () => {
  const webApp = fs.readFileSync('apps-script/01_WebApp.gs', 'utf8');
  const assessments = fs.readFileSync('apps-script/04_Assessments.gs', 'utf8');

  assert.match(webApp, /removeAssessmentTest: removeAssessmentTest/);
  assert.match(assessments, /function removeAssessmentTest\(payload\)/);
  assert.match(assessments, /Somente avaliações em rascunho podem ter testes retirados/);
  assert.match(assessments, /deleteRowsByField_\(SHEETS\.RESULTS, 'resultadoId'/);
});

test('declares listing and permanent deletion only for archived drafts', () => {
  const webApp = fs.readFileSync('apps-script/01_WebApp.gs', 'utf8');
  const assessments = fs.readFileSync('apps-script/04_Assessments.gs', 'utf8');

  assert.match(webApp, /listArchivedDrafts: listArchivedDrafts/);
  assert.match(webApp, /deleteArchivedAssessment: deleteArchivedAssessment/);
  assert.match(assessments, /function listArchivedDrafts\(\)/);
  assert.match(assessments, /function deleteArchivedAssessment\(payload\)/);
  assert.match(assessments, /Somente rascunhos arquivados podem ser apagados permanentemente/);
  assert.match(assessments, /deleteRowsByField_\(SHEETS\.HISTORY_SUMMARIES, 'avaliacaoId'/);
});
