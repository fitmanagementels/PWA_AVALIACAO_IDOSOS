export function measurementValue(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

export function personForSave(person) {
  return {
    pessoaId: person.id,
    nomeCompleto: person.name,
    dataNascimento: person.birthDate,
    sexo: person.sex,
    whatsApp: person.whatsapp || ''
  };
}

export function personFromApi(person) {
  return {
    id: person.pessoaId,
    name: person.nomeCompleto,
    birthDate: person.dataNascimento,
    sex: person.sexo,
    whatsapp: person.whatsApp || ''
  };
}

export function assessmentForCreate(assessment) {
  return {
    avaliacaoId: assessment.id,
    pessoaId: assessment.personId,
    data: assessment.date,
    profissionalNome: assessment.professionalName,
    testesSelecionados: assessment.testIds
  };
}

export function assessmentFromApi(assessment) {
  let testIds = [];
  try { testIds = Array.isArray(assessment.testesSelecionados) ? assessment.testesSelecionados : JSON.parse(assessment.testesSelecionados || '[]'); } catch (_) { testIds = []; }
  return {
    id: assessment.avaliacaoId,
    personId: assessment.pessoaId,
    date: assessment.data,
    professionalName: assessment.profissionalNome,
    status: assessment.status,
    testIds
  };
}

export function historySummaryFromApi(summary) {
  let rows = [];
  try { rows = JSON.parse(summary.resultadosResumoJson || '[]'); } catch (_) { rows = []; }
  return { assessment: assessmentFromApi(summary), results: resultsFromApi(rows) };
}

export function resultsFromApi(rows) {
  const grouped = new Map();
  (rows || []).forEach((row) => {
    const item = grouped.get(row.testeId) || { testId: row.testeId, status: row.status, unit: row.unidade || '', attempts: [], officialBySide: {}, reason: row.motivoNaoConcluido || '' };
    const side = row.lado || 'unico';
    item.status = row.status;
    if (row.status === 'concluido') item.officialBySide[side] = measurementValue(row.valorOficial);
    (row.tentativas || []).forEach((attempt) => {
      const value = measurementValue(attempt.valor);
      if (value !== null) item.attempts.push({ side, value, order: Number(attempt.ordem) || item.attempts.length + 1 });
    });
    if (row.motivoNaoConcluido) item.reason = row.motivoNaoConcluido;
    grouped.set(row.testeId, item);
  });
  return [...grouped.values()];
}

function resultRows(assessment, result) {
  if (result.status === 'naoConcluido') {
    return [{
      resultadoId: `${assessment.id}:${result.testId}`,
      testeId: result.testId,
      status: result.status,
      lado: '',
      valorOficial: '',
      unidade: result.unit || '',
      classificacao: result.classification || '',
      protocoloVersao: 1,
      motivoNaoConcluido: result.reason,
      tentativas: []
    }];
  }
  return Object.entries(result.officialBySide || {}).map(([side, officialValue]) => ({
    resultadoId: `${assessment.id}:${result.testId}:${side}`,
    testeId: result.testId,
    status: result.status,
    lado: side === 'unico' ? '' : side,
    valorOficial: officialValue,
    unidade: result.unit,
    classificacao: result.classification || '',
    protocoloVersao: 1,
    motivoNaoConcluido: '',
    tentativas: (result.attempts || []).filter((attempt) => (attempt.side || 'unico') === side).map((attempt, index) => ({
      tentativaId: `${assessment.id}:${result.testId}:${side}:${index + 1}`,
      ordem: index + 1,
      lado: side === 'unico' ? '' : side,
      valor: attempt.value,
      unidade: result.unit,
      valida: true
    }))
  }));
}

export function assessmentForSave(assessment) {
  return {
    avaliacaoId: assessment.id,
    pessoaId: assessment.personId,
    data: assessment.date,
    profissionalNome: assessment.professionalName,
    testesSelecionados: assessment.testIds,
    notasTestes: assessment.testNotes || '',
    observacoesAluno: assessment.studentObservations || '',
    resultados: (assessment.results || []).flatMap((result) => resultRows(assessment, result))
  };
}
