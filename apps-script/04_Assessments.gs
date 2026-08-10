function validateAssessment_(assessment) {
  if (!assessment.pessoaId || !assessment.data || !PROFESSIONALS.includes(assessment.profissionalNome)) throw new Error('Profissional responsável é obrigatório');
  if (!Array.isArray(assessment.testesSelecionados) || !assessment.testesSelecionados.length) throw new Error('Selecione ao menos um teste');
  (assessment.resultados || []).forEach(function(result) { if (result.status === 'naoConcluido' && !result.motivoNaoConcluido) throw new Error('Informe o motivo do teste não concluído'); });
}

function compactAssessment_(assessment) {
  if (!assessment) return null;
  return { avaliacaoId: assessment.avaliacaoId, data: assessment.data, profissionalNome: assessment.profissionalNome, status: assessment.status, ultimaAtualizacao: assessment.ultimaAtualizacao };
}
function newestAssessment_(assessments) { return assessments.sort(function(a, b) { return String(b.ultimaAtualizacao || b.data || '').localeCompare(String(a.ultimaAtualizacao || a.data || '')); })[0] || null; }
function assessmentFlow_(assessments, pessoaId) {
  const personAssessments = assessments.filter(function(assessment) { return assessment.pessoaId === pessoaId; });
  return {
    rascunhoAtivo: compactAssessment_(newestAssessment_(personAssessments.filter(function(assessment) { return assessment.status === 'rascunho' || assessment.status === 'pendenteDeSincronizacao'; }))),
    ultimaConcluida: compactAssessment_(newestAssessment_(personAssessments.filter(function(assessment) { return assessment.status === 'concluida'; })))
  };
}
function listPeople() {
  const assessments = getRows_(SHEETS.ASSESSMENTS);
  return jsonOk_(getRows_(SHEETS.PEOPLE).filter(function(person) { return person.status !== 'arquivado'; }).map(function(person) {
    person.fluxo = assessmentFlow_(assessments, person.pessoaId);
    return person;
  }));
}
function getPerson(params) { const person = getRows_(SHEETS.PEOPLE).find(function(row) { return row.pessoaId === params.pessoaId; }); return person ? jsonOk_(person) : jsonError_('NOT_FOUND', 'Pessoa não encontrada'); }
function getPersonFlow(params) { return jsonOk_(assessmentFlow_(getRows_(SHEETS.ASSESSMENTS), params.pessoaId)); }
function getAssessment(params) { const assessment = getRows_(SHEETS.ASSESSMENTS).find(function(row) { return row.avaliacaoId === params.avaliacaoId; }); if (!assessment) return jsonError_('NOT_FOUND', 'Avaliação não encontrada'); const results = getRows_(SHEETS.RESULTS).filter(function(row) { return row.avaliacaoId === assessment.avaliacaoId; }); const attempts = getRows_(SHEETS.ATTEMPTS); results.forEach(function(result) { result.tentativas = attempts.filter(function(item) { return item.resultadoId === result.resultadoId; }); }); return jsonOk_({ assessment: assessment, results: results }); }
function getHistory(params) { const results = getRows_(SHEETS.RESULTS); return jsonOk_(getRows_(SHEETS.ASSESSMENTS).filter(function(row) { return row.pessoaId === params.pessoaId && row.status !== 'arquivada'; }).sort(function(a, b) { return String(b.data).localeCompare(String(a.data)); }).map(function(assessment) { return { assessment: assessment, results: results.filter(function(result) { return result.avaliacaoId === assessment.avaliacaoId; }) }; })); }
function getHistorySummary(params) { ensureHistorySummary_(); return jsonOk_(getRows_(SHEETS.HISTORY_SUMMARIES).filter(function(row) { return row.pessoaId === params.pessoaId && row.status !== 'arquivada'; }).sort(function(a, b) { return String(b.data).localeCompare(String(a.data)); })); }
function getCatalog() { return jsonOk_({ tests: INITIAL_CATALOG, stepReferences: STEP_TEST_REFERENCES }); }

function updateHistorySummary_(assessment, results) {
  updateRowById_(SHEETS.HISTORY_SUMMARIES, 'resumoId', {
    resumoId: assessment.avaliacaoId,
    pessoaId: assessment.pessoaId,
    avaliacaoId: assessment.avaliacaoId,
    data: assessment.data,
    profissionalNome: assessment.profissionalNome,
    status: assessment.status,
    testesSelecionados: assessment.testesSelecionados,
    resultadosResumoJson: JSON.stringify(results || []),
    ultimaAtualizacao: assessment.ultimaAtualizacao
  });
}

function rebuildHistorySummaries_() { const resultsByAssessment = getRows_(SHEETS.RESULTS).reduce(function(index, result) { if (!index[result.avaliacaoId]) index[result.avaliacaoId] = []; index[result.avaliacaoId].push(result); return index; }, {}); const assessments = getRows_(SHEETS.ASSESSMENTS); assessments.forEach(function(assessment) { updateHistorySummary_(assessment, resultsByAssessment[assessment.avaliacaoId] || []); }); return assessments.length; }
function rebuildHistorySummaries() { return withLock_(function() { return jsonOk_({ message: 'Resumo de histórico atualizado', records: rebuildHistorySummaries_() }); }); }
function ensureHistorySummary_() { return withLock_(function() { const book = spreadsheet_(); let sheet = book.getSheetByName(SHEETS.HISTORY_SUMMARIES); if (!sheet) sheet = book.insertSheet(SHEETS.HISTORY_SUMMARIES); if (sheet.getLastRow() === 0) sheet.appendRow(SHEET_HEADERS.HistoricoResumo); if (!getRows_(SHEETS.HISTORY_SUMMARIES).length && getRows_(SHEETS.ASSESSMENTS).length) rebuildHistorySummaries_(); }); }

function savePerson(payload) { return withLock_(function() { if (!payload.nomeCompleto || !payload.dataNascimento || !payload.sexo) return jsonError_('VALIDATION_ERROR', 'Nome, data de nascimento e sexo são obrigatórios'); const record = { pessoaId: payload.pessoaId || Utilities.getUuid(), nomeCompleto: payload.nomeCompleto, dataNascimento: payload.dataNascimento, sexo: payload.sexo, whatsApp: String(payload.whatsApp || '').replace(/\D/g, ''), status: payload.status || 'ativo', criadoEm: payload.criadoEm || new Date().toISOString() }; updateRowById_(SHEETS.PEOPLE, 'pessoaId', record); return jsonOk_(record); }); }
function createAssessment(payload) { return withLock_(function() { const record = { avaliacaoId: payload.avaliacaoId || Utilities.getUuid(), pessoaId: payload.pessoaId, data: payload.data, profissionalNome: payload.profissionalNome, status: 'rascunho', testesSelecionados: JSON.stringify(payload.testesSelecionados || []), notasTestes: '', observacoesAluno: '', criadoEm: new Date().toISOString(), ultimaAtualizacao: new Date().toISOString() }; validateAssessment_({ pessoaId: record.pessoaId, data: record.data, profissionalNome: record.profissionalNome, testesSelecionados: payload.testesSelecionados }); const active = assessmentFlow_(getRows_(SHEETS.ASSESSMENTS), record.pessoaId).rascunhoAtivo; if (active && active.avaliacaoId !== record.avaliacaoId) return jsonError_('ACTIVE_DRAFT_EXISTS', 'Já existe uma avaliação em andamento para esta pessoa. Retome ou arquive o rascunho antes de criar outra.'); updateRowById_(SHEETS.ASSESSMENTS, 'avaliacaoId', record); updateHistorySummary_(record, []); return jsonOk_(record); }); }
function numericField_(value) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function classificationForSavedResult_(result, person, assessmentDate, referenceRows) {
  if (result.status !== 'concluido' || !person) return result.classificacao || '';
  const classification = classifyReferenceValue_(referenceRows, {
    testId: result.testeId,
    sex: person.sexo,
    age: ageOnDate(person.dataNascimento, assessmentDate),
    value: numericField_(result.valorOficial),
    unit: result.unidade,
    assessmentDate: assessmentDate
  });
  return classification || result.classificacao || '';
}

function backScratchReferenceRecord_() {
  return {
    referenciaId: 'ref-back-scratch-v1',
    testeId: 'back-scratch',
    versao: 1,
    criteriosJson: JSON.stringify({
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
    }),
    classificacao: 'qualitativa-3-faixas',
    vigencia: '2026-08-10'
  };
}

function seedBackScratchReference() {
  return withLock_(function() {
    const record = backScratchReferenceRecord_();
    updateRowById_(SHEETS.REFERENCES, 'referenciaId', record);
    return jsonOk_(record);
  });
}

function saveAssessment(payload) { return withLock_(function() { validateAssessment_(payload); const now = new Date().toISOString(); const person = getRows_(SHEETS.PEOPLE).find(function(item) { return item.pessoaId === payload.pessoaId; }) || null; const referenceRows = getRows_(SHEETS.REFERENCES); const record = { avaliacaoId: payload.avaliacaoId, pessoaId: payload.pessoaId, data: payload.data, profissionalNome: payload.profissionalNome, status: 'rascunho', testesSelecionados: JSON.stringify(payload.testesSelecionados), notasTestes: payload.notasTestes || '', observacoesAluno: payload.observacoesAluno || '', criadoEm: payload.criadoEm || now, ultimaAtualizacao: now }; updateRowById_(SHEETS.ASSESSMENTS, 'avaliacaoId', record); const summaryResults = []; (payload.resultados || []).forEach(function(result) { const resultRecord = { resultadoId: result.resultadoId || Utilities.getUuid(), avaliacaoId: record.avaliacaoId, testeId: result.testeId, status: result.status, lado: result.lado || '', valorOficial: fieldOrBlank_(result.valorOficial), unidade: result.unidade || '', classificacao: classificationForSavedResult_(result, person, payload.data, referenceRows), protocoloVersao: result.protocoloVersao || 1, motivoNaoConcluido: result.motivoNaoConcluido || '' }; summaryResults.push(resultRecord); updateRowById_(SHEETS.RESULTS, 'resultadoId', resultRecord); (result.tentativas || []).forEach(function(attempt) { updateRowById_(SHEETS.ATTEMPTS, 'tentativaId', { tentativaId: attempt.tentativaId || Utilities.getUuid(), resultadoId: resultRecord.resultadoId, ordem: attempt.ordem, lado: attempt.lado || '', valor: fieldOrBlank_(attempt.valor), unidade: attempt.unidade, valida: attempt.valida !== false, criadoEm: now }); }); }); updateHistorySummary_(record, summaryResults); return jsonOk_({ avaliacaoId: record.avaliacaoId, ultimaAtualizacao: now }); }); }
function assessmentCanComplete_(payload) { const selected = payload.testesSelecionados || []; const results = payload.resultados || []; if (selected.some(function(id) { return !results.some(function(result) { return result.testeId === id; }); })) throw new Error('Preencha ou informe o motivo para todos os testes selecionados'); results.forEach(function(result) { if (result.status === 'naoConcluido' && !String(result.motivoNaoConcluido || '').trim()) throw new Error('Informe o motivo do teste não concluído'); }); }
function completeAssessment(payload) { assessmentCanComplete_(payload); const saved = saveAssessment(payload); if (!saved.ok) return saved; return withLock_(function() { const assessment = getRows_(SHEETS.ASSESSMENTS).find(function(row) { return row.avaliacaoId === payload.avaliacaoId; }); assessment.status = 'concluida'; assessment.ultimaAtualizacao = new Date().toISOString(); updateRowById_(SHEETS.ASSESSMENTS, 'avaliacaoId', assessment); updateHistorySummary_(assessment, getRows_(SHEETS.RESULTS).filter(function(result) { return result.avaliacaoId === assessment.avaliacaoId; })); return jsonOk_(assessment); }); }
function archiveAssessment(payload) { return withLock_(function() { const assessment = getRows_(SHEETS.ASSESSMENTS).find(function(row) { return row.avaliacaoId === payload.avaliacaoId; }); if (!assessment) return jsonError_('NOT_FOUND', 'Avaliação não encontrada'); if (assessment.status !== 'rascunho' && assessment.status !== 'pendenteDeSincronizacao') return jsonError_('INVALID_STATUS', 'Somente rascunhos em andamento podem ser arquivados'); assessment.status = 'arquivada'; assessment.ultimaAtualizacao = new Date().toISOString(); updateRowById_(SHEETS.ASSESSMENTS, 'avaliacaoId', assessment); updateHistorySummary_(assessment, getRows_(SHEETS.RESULTS).filter(function(result) { return result.avaliacaoId === assessment.avaliacaoId; })); return jsonOk_(assessment); }); }
