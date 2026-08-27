import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dateOnly = (value) => String(value || '').slice(0, 10);
const rows = (input, name) => input?.sheets?.[name] || [];
const knownProfessionals = { Elohim: 'professional-elohim', Victor: 'professional-victor', Lucas: 'professional-lucas', 'Carlos Eduardo': 'professional-carlos-eduardo' };
const parseJson = (value, label) => {
  if (!String(value || '').trim()) return null;
  try { return JSON.parse(value); } catch { throw new Error(`JSON inválido em ${label}`); }
};
const string = (value) => String(value ?? '');
const number = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(String(value).replace(',', '.'));
  if (!Number.isFinite(parsed)) throw new Error(`Número inválido: ${value}`);
  return parsed;
};
const professionalId = (name, fallback) => knownProfessionals[name] || fallback || `professional-${String(name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g)}`;

export function validateExport(input) {
  if (!input || input.schemaVersion !== 1 || !input.sheets) throw new Error('Exportação inválida');
  const people = rows(input, 'Pessoas').map((row) => ({ id: row.pessoaId, fullName: row.nomeCompleto, birthDate: dateOnly(row.dataNascimento), sex: row.sexo, whatsapp: row.whatsApp || '', status: row.status || 'ativo', createdAt: row.criadoEm }));
  const professionals = rows(input, 'Profissionais').map((row) => ({ id: professionalId(row.nome, row.profissionalId), name: row.nome, active: row.ativo !== false }));
  const assessments = rows(input, 'Avaliacoes').map((row) => ({
    id: row.avaliacaoId, personId: row.pessoaId, assessmentDate: dateOnly(row.data), professionalId: professionalId(row.profissionalNome), status: row.status,
    testIds: parseJson(row.testesSelecionados, `Avaliacoes/${row.avaliacaoId}`) || [], testNotes: row.notasTestes || '', studentObservations: row.observacoesAluno || '', createdAt: row.criadoEm, updatedAt: row.ultimaAtualizacao,
  }));
  const results = rows(input, 'Resultados').map((row) => ({
    id: row.resultadoId, assessmentId: row.avaliacaoId, testId: row.testeId, status: row.status, side: row.lado || '', officialValue: number(row.valorOficial), unit: row.unidade || '', classification: row.classificacao || '', protocolVersion: number(row.protocoloVersao) || 1,
    nonCompletionReason: row.motivoNaoConcluido || '', referenceId: row.referenciaId || '', referenceVersion: number(row.referenciaVersao), referenceApplicationJson: row.referenciaAplicadaJson || '',
  }));
  const attempts = rows(input, 'Tentativas').map((row) => ({ id: row.tentativaId, resultId: row.resultadoId, ordinal: number(row.ordem), side: row.lado || '', value: number(row.valor), unit: row.unidade || '', valid: row.valida !== false, createdAt: row.criadoEm }));
  const catalog = rows(input, 'CatalogoTestes').map((row) => ({ id: row.testeId, name: row.nome, domain: row.dominio, unit: row.unidade, configurationJson: row.configuracaoJson || '{}' }));
  const references = rows(input, 'Referencias').map((row) => ({ id: row.referenciaId, testId: row.testeId, version: number(row.versao), criteriaJson: row.criteriosJson || '{}', classification: row.classificacao || '', effectiveOn: dateOnly(row.vigencia) }));
  const protocols = rows(input, 'Protocolos').map((row) => ({ id: row.protocoloId, testId: row.testeId, version: number(row.versao), text: row.texto || '', configurationJson: row.configuracaoJson || '{}', effectiveOn: dateOnly(row.vigencia) }));

  const assertIds = (items, key, name) => {
    const ids = new Set();
    items.forEach((item) => { if (!item[key] || ids.has(item[key])) throw new Error(`${name} com ID ausente ou duplicado`); ids.add(item[key]); });
    return ids;
  };
  const peopleIds = assertIds(people, 'id', 'Pessoas');
  const professionalIds = assertIds(professionals, 'id', 'Profissionais');
  const assessmentIds = assertIds(assessments, 'id', 'Avaliações');
  const resultIds = assertIds(results, 'id', 'Resultados');
  assertIds(attempts, 'id', 'Tentativas'); assertIds(catalog, 'id', 'Catálogo'); assertIds(references, 'id', 'Referências'); assertIds(protocols, 'id', 'Protocolos');
  assessments.forEach((assessment) => {
    if (!peopleIds.has(assessment.personId)) throw new Error('Avaliação sem pessoa');
    if (!professionalIds.has(assessment.professionalId) && !Object.values(knownProfessionals).includes(assessment.professionalId)) throw new Error('Avaliação sem profissional');
  });
  results.forEach((result) => { if (!assessmentIds.has(result.assessmentId)) throw new Error('Resultado sem avaliação'); if (result.referenceApplicationJson) parseJson(result.referenceApplicationJson, `Resultados/${result.id}`); });
  attempts.forEach((attempt) => { if (!resultIds.has(attempt.resultId)) throw new Error('Tentativa sem resultado'); });
  catalog.forEach((item) => parseJson(item.configurationJson, `CatalogoTestes/${item.id}`));
  references.forEach((item) => parseJson(item.criteriaJson, `Referencias/${item.id}`));
  protocols.forEach((item) => parseJson(item.configurationJson, `Protocolos/${item.id}`));

  const normalized = { people, professionals, assessments, results, attempts, catalog, references, protocols };
  const counts = Object.fromEntries(Object.entries(normalized).map(([key, value]) => [key, value.length]));
  const checksum = createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
  return { ok: true, normalized, counts, checksum };
}

function sql(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'number') return String(value);
  return `'${string(value).replace(/'/g, "''")}'`;
}

function upsert(table, columns, row, updateColumns = columns.filter((column) => column !== 'id')) {
  const values = columns.map((column) => sql(row[column])).join(', ');
  const updates = updateColumns.map((column) => `${column} = excluded.${column}`).join(', ');
  return `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values}) ON CONFLICT(id) DO UPDATE SET ${updates};`;
}

export function buildImportSql(report, importedAt = new Date().toISOString()) {
  const { normalized, checksum, counts } = report;
  const lines = ['PRAGMA foreign_keys = ON;', 'BEGIN TRANSACTION;'];
  const people = normalized.people.map((item) => ({ ...item, createdAt: item.createdAt || importedAt }));
  const assessments = normalized.assessments.map((item) => ({ ...item, createdAt: item.createdAt || importedAt, updatedAt: item.updatedAt || item.createdAt || importedAt }));
  const attempts = normalized.attempts.map((item) => ({ ...item, createdAt: item.createdAt || importedAt, valid: item.valid ? 1 : 0 }));
  normalized.professionals.forEach((item) => lines.push(upsert('professionals', ['id', 'name', 'active'], { ...item, active: item.active ? 1 : 0 })));
  people.forEach((item) => lines.push(upsert('people', ['id', 'full_name', 'birth_date', 'sex', 'whatsapp', 'status', 'created_at'], { id: item.id, full_name: item.fullName, birth_date: item.birthDate, sex: item.sex, whatsapp: item.whatsapp, status: item.status, created_at: item.createdAt }, ['full_name', 'birth_date', 'sex', 'whatsapp', 'status'])));
  normalized.catalog.forEach((item) => lines.push(upsert('catalog_tests', ['id', 'name', 'domain', 'unit', 'configuration_json'], { id: item.id, name: item.name, domain: item.domain, unit: item.unit, configuration_json: item.configurationJson })));
  normalized.references.forEach((item) => lines.push(upsert('references_catalog', ['id', 'test_id', 'version', 'criteria_json', 'classification', 'effective_on'], { id: item.id, test_id: item.testId, version: item.version, criteria_json: item.criteriaJson, classification: item.classification, effective_on: item.effectiveOn })));
  normalized.protocols.forEach((item) => lines.push(upsert('protocols', ['id', 'test_id', 'version', 'text', 'configuration_json', 'effective_on'], { id: item.id, test_id: item.testId, version: item.version, text: item.text, configuration_json: item.configurationJson, effective_on: item.effectiveOn })));
  assessments.forEach((item) => {
    lines.push(upsert('assessments', ['id', 'person_id', 'assessment_date', 'professional_id', 'status', 'test_notes', 'student_observations', 'created_at', 'updated_at'], { id: item.id, person_id: item.personId, assessment_date: item.assessmentDate, professional_id: item.professionalId, status: item.status, test_notes: item.testNotes, student_observations: item.studentObservations, created_at: item.createdAt, updated_at: item.updatedAt }, ['person_id', 'assessment_date', 'professional_id', 'status', 'test_notes', 'student_observations', 'updated_at']));
    item.testIds.forEach((testId, position) => lines.push(`INSERT INTO assessment_tests (assessment_id, test_id, position) VALUES (${sql(item.id)}, ${sql(testId)}, ${position}) ON CONFLICT(assessment_id, test_id) DO UPDATE SET position = excluded.position;`));
  });
  normalized.results.forEach((item) => lines.push(upsert('results', ['id', 'assessment_id', 'test_id', 'status', 'side', 'official_value', 'unit', 'classification', 'protocol_version', 'non_completion_reason', 'reference_id', 'reference_version', 'reference_application_json'], { id: item.id, assessment_id: item.assessmentId, test_id: item.testId, status: item.status, side: item.side, official_value: item.officialValue, unit: item.unit, classification: item.classification, protocol_version: item.protocolVersion, non_completion_reason: item.nonCompletionReason, reference_id: item.referenceId, reference_version: item.referenceVersion, reference_application_json: item.referenceApplicationJson })));
  attempts.forEach((item) => lines.push(upsert('attempts', ['id', 'result_id', 'ordinal', 'side', 'value', 'unit', 'valid', 'created_at'], { id: item.id, result_id: item.resultId, ordinal: item.ordinal, side: item.side, value: item.value, unit: item.unit, valid: item.valid, created_at: item.createdAt })));
  lines.push(upsert('migration_audit', ['id', 'source_name', 'imported_at', 'checksum', 'counts_json'], { id: `sheets-${checksum}`, source_name: 'google-sheets', imported_at: importedAt, checksum, counts_json: JSON.stringify(counts) }));
  lines.push('COMMIT;');
  return `${lines.join('\n')}\n`;
}

export async function importRemote(report, { database = 'pwa-avaliacao-idosos', config = 'worker/wrangler.jsonc', importedAt } = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'pwa-avaliacao-d1-'));
  const sqlFile = join(directory, 'import.sql');
  try {
    await writeFile(sqlFile, buildImportSql(report, importedAt), 'utf8');
    const result = spawnSync('npx', ['--yes', 'wrangler@3.114.10', 'd1', 'execute', database, '--remote', '--config', config, '--file', sqlFile], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'A importação remota falhou');
    return { ok: true, counts: report.counts, checksum: report.checksum, output: result.stdout };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function main() {
  const args = process.argv.slice(2);
  const inputPath = args[args.indexOf('--input') + 1];
  const remote = args.includes('--remote'); const dryRun = args.includes('--dry-run');
  const approvedChecksum = args[args.indexOf('--approved-checksum') + 1];
  const database = args[args.indexOf('--database') + 1] || 'pwa-avaliacao-idosos';
  if (!inputPath || (!dryRun && !remote)) throw new Error('Uso: node scripts/import-d1.mjs --input <arquivo> --dry-run | --remote --approved-checksum <checksum>');
  if (dryRun && remote) throw new Error('Escolha apenas --dry-run ou --remote');
  const report = validateExport(JSON.parse(await readFile(inputPath, 'utf8')));
  if (dryRun) return console.log(JSON.stringify({ ok: report.ok, counts: report.counts, checksum: report.checksum }, null, 2));
  if (!approvedChecksum || approvedChecksum !== report.checksum) throw new Error('Checksum aprovado não confere com o dry-run. A importação foi bloqueada.');
  const result = await importRemote(report, { database });
  console.log(JSON.stringify({ ok: result.ok, counts: result.counts, checksum: result.checksum }, null, 2));
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
