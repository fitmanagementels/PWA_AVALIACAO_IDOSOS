import assert from 'node:assert/strict';
import test from 'node:test';
import { buildImportSql, validateExport } from '../scripts/import-d1.mjs';

const fixture = {
  schemaVersion: 1,
  sheets: {
    Pessoas: [{ pessoaId: 'pessoa-1', nomeCompleto: 'Maria', dataNascimento: '1954-08-02T03:00:00.000Z', sexo: 'feminino', whatsApp: '', status: 'ativo', criadoEm: '2026-08-01T10:00:00.000Z' }],
    Profissionais: [{ profissionalId: 'professional-elohim', nome: 'Elohim', ativo: true }],
    Avaliacoes: [{ avaliacaoId: 'avaliacao-1', pessoaId: 'pessoa-1', data: '2026-08-10T03:00:00.000Z', profissionalNome: 'Elohim', status: 'concluida', testesSelecionados: '["back-scratch"]', notasTestes: '', observacoesAluno: '', criadoEm: '2026-08-10T10:00:00.000Z', ultimaAtualizacao: '2026-08-10T10:00:00.000Z' }],
    Resultados: [{ resultadoId: 'resultado-1', avaliacaoId: 'avaliacao-1', testeId: 'back-scratch', status: 'concluido', lado: 'direito', valorOficial: -10, unidade: 'cm', classificacao: '', protocoloVersao: 1, motivoNaoConcluido: '', referenciaId: '', referenciaVersao: '', referenciaAplicadaJson: '{"faixa":{"min":-14,"max":0,"unidade":"cm"},"rotulos":{}}' }],
    Tentativas: [{ tentativaId: 'tentativa-1', resultadoId: 'resultado-1', ordem: 1, lado: 'direito', valor: -10, unidade: 'cm', valida: true, criadoEm: '2026-08-10T10:00:00.000Z' }],
    CatalogoTestes: [], Referencias: [], Protocolos: [], HistoricoResumo: [],
  },
};

test('normaliza datas Sheets e preserva IDs e snapshot de referência', () => {
  const report = validateExport(fixture);
  assert.equal(report.ok, true);
  assert.equal(report.normalized.people[0].id, 'pessoa-1');
  assert.equal(report.normalized.people[0].birthDate, '1954-08-02');
  assert.equal(report.normalized.results[0].referenceApplicationJson, fixture.sheets.Resultados[0].referenciaAplicadaJson);
});

test('dry-run rejeita tentativa sem resultado pai', () => {
  const invalid = structuredClone(fixture);
  invalid.sheets.Tentativas[0].resultadoId = 'ausente';
  assert.throws(() => validateExport(invalid), /Tentativa sem resultado/);
});

test('gera importação transacional com auditoria, sem interpolar dados sem escape', () => {
  const report = validateExport({
    schemaVersion: 1,
    sheets: {
      Pessoas: [{ pessoaId: 'pessoa-1', nomeCompleto: "D'Ávila", dataNascimento: '1950-01-01', sexo: 'feminino', whatsApp: '85999999999', status: 'ativo', criadoEm: '2026-08-01T10:00:00.000Z' }],
      Profissionais: [], Avaliacoes: [], Resultados: [], Tentativas: [], CatalogoTestes: [], Referencias: [], Protocolos: [], HistoricoResumo: []
    }
  });
  const sql = buildImportSql(report, '2026-08-27T12:00:00.000Z');
  assert.match(sql, /BEGIN TRANSACTION;/);
  assert.match(sql, /D''Ávila/);
  assert.match(sql, /INSERT INTO migration_audit/);
  assert.match(sql, /COMMIT;/);
});
