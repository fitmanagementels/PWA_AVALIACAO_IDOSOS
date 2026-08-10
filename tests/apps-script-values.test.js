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
