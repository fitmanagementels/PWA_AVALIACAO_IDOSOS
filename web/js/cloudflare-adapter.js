const PROFESSIONAL_IDS = {
  Elohim: 'professional-elohim',
  Victor: 'professional-victor',
  Lucas: 'professional-lucas',
  'Carlos Eduardo': 'professional-carlos-eduardo',
};

const PROFESSIONAL_NAMES = Object.fromEntries(Object.entries(PROFESSIONAL_IDS).map(([name, id]) => [id, name]));

function withoutUndefined(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));
}

function professionalId(value) {
  return PROFESSIONAL_IDS[value] || value || '';
}

function professionalName(value) {
  return PROFESSIONAL_NAMES[value] || value || '';
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  try { return JSON.parse(value || '[]'); } catch (_) { return []; }
}

function legacyPerson(person) {
  if (!person) return person;
  return {
    pessoaId: person.id,
    nomeCompleto: person.fullName,
    dataNascimento: person.birthDate,
    sexo: person.sex,
    whatsApp: person.whatsapp || '',
    status: person.status,
    criadoEm: person.createdAt,
    ...(person.flow ? { fluxo: legacyFlow(person.flow) } : {}),
  };
}

function legacyCompactAssessment(assessment) {
  if (!assessment) return null;
  return {
    avaliacaoId: assessment.id,
    pessoaId: assessment.personId,
    data: assessment.assessmentDate,
    profissionalNome: assessment.professionalName || professionalName(assessment.professionalId),
    status: assessment.status,
    criadoEm: assessment.createdAt,
    ultimaAtualizacao: assessment.updatedAt,
  };
}

function legacyFlow(flow) {
  if (!flow) return flow;
  if (flow.rascunhoAtivo || flow.ultimaConcluida) return flow;
  return {
    rascunhoAtivo: legacyCompactAssessment(flow.activeDraft),
    ultimaConcluida: legacyCompactAssessment(flow.latestCompleted),
  };
}

function legacyAssessment(assessment) {
  if (!assessment) return assessment;
  return {
    ...legacyCompactAssessment(assessment),
    testesSelecionados: asArray(assessment.testIds),
    notasTestes: assessment.testNotes || '',
    observacoesAluno: assessment.studentObservations || '',
  };
}

function legacyAttempt(attempt) {
  return {
    tentativaId: attempt.id,
    ordem: attempt.ordinal,
    lado: attempt.side || '',
    valor: attempt.value,
    unidade: attempt.unit || '',
    valida: attempt.valid !== false,
    criadoEm: attempt.createdAt,
  };
}

function legacyResult(result) {
  return {
    resultadoId: result.id,
    avaliacaoId: result.assessmentId,
    testeId: result.testId,
    status: result.status,
    lado: result.side || '',
    valorOficial: result.officialValue,
    unidade: result.unit || '',
    classificacao: result.classification || '',
    protocoloVersao: result.protocolVersion || 1,
    motivoNaoConcluido: result.nonCompletionReason || '',
    referenciaId: result.referenceId || '',
    referenciaVersao: result.referenceVersion ?? null,
    referenciaAplicadaJson: result.referenceApplicationJson || '',
    tentativas: (result.attempts || []).map(legacyAttempt),
  };
}

function cloudflareAttempt(attempt) {
  return withoutUndefined({
    id: attempt.tentativaId || attempt.id,
    ordinal: Number(attempt.ordem || attempt.ordinal),
    side: attempt.lado || attempt.side || '',
    value: attempt.valor ?? attempt.value,
    unit: attempt.unidade || attempt.unit || '',
    valid: attempt.valida !== false && attempt.valid !== false,
    createdAt: attempt.criadoEm || attempt.createdAt,
  });
}

function cloudflareResult(result, assessmentId) {
  return {
    id: result.resultadoId || result.id,
    assessmentId,
    testId: result.testeId || result.testId,
    status: result.status,
    side: result.lado || result.side || '',
    officialValue: result.valorOficial ?? result.officialValue ?? null,
    unit: result.unidade || result.unit || '',
    classification: result.classificacao || result.classification || '',
    protocolVersion: result.protocoloVersao || result.protocolVersion || 1,
    nonCompletionReason: result.motivoNaoConcluido || result.nonCompletionReason || '',
    referenceId: result.referenciaId || result.referenceId || '',
    referenceVersion: result.referenciaVersao ?? result.referenceVersion ?? null,
    referenceApplicationJson: result.referenciaAplicadaJson || result.referenceApplicationJson || '',
    attempts: (result.tentativas || result.attempts || []).map(cloudflareAttempt),
  };
}

function cloudflareAssessment(payload) {
  const id = payload.avaliacaoId || payload.id;
  return withoutUndefined({
    id,
    personId: payload.pessoaId || payload.personId,
    assessmentDate: payload.data || payload.assessmentDate,
    professionalId: professionalId(payload.profissionalNome || payload.professionalName || payload.professionalId),
    testIds: asArray(payload.testesSelecionados || payload.testIds),
    testNotes: payload.notasTestes || payload.testNotes || '',
    studentObservations: payload.observacoesAluno || payload.studentObservations || '',
    status: payload.status,
    createdAt: payload.criadoEm || payload.createdAt,
    results: (payload.resultados || payload.results || []).map((result) => cloudflareResult(result, id)),
  });
}

export function toCloudflarePayload(action, payload = {}) {
  if (action === 'savePerson') {
    return {
      id: payload.pessoaId || payload.id,
      fullName: payload.nomeCompleto || payload.fullName || payload.name,
      birthDate: payload.dataNascimento || payload.birthDate,
      sex: payload.sexo || payload.sex,
      whatsapp: payload.whatsApp || payload.whatsapp || '',
      status: payload.status,
      createdAt: payload.criadoEm || payload.createdAt,
    };
  }
  if (['createAssessment', 'saveAssessment', 'completeAssessment'].includes(action)) return cloudflareAssessment(payload);
  return payload;
}

export function fromCloudflareResponse(action, response) {
  if (!response?.ok) return response;
  const data = response.data;

  if (action === 'listPeople') return { ...response, data: (data || []).map(legacyPerson) };
  if (action === 'getPerson') return { ...response, data: legacyPerson(data) };
  if (action === 'getPersonFlow') return { ...response, data: legacyFlow(data) };
  if (action === 'listArchivedDrafts') return { ...response, data: (data || []).map((draft) => ({ ...legacyAssessment(draft), pessoaNome: draft.personName || '' })) };
  if (action === 'getAssessment') {
    return {
      ...response,
      data: { assessment: legacyAssessment(data.assessment), results: (data.results || []).map(legacyResult) },
    };
  }
  if (action === 'getHistory' || action === 'getHistorySummary') {
    return {
      ...response,
      data: (data || []).map(({ assessment, results }) => ({
        ...legacyAssessment(assessment),
        resultadosResumoJson: JSON.stringify((results || []).map(legacyResult)),
      })),
    };
  }
  if (action === 'getCatalog') return { ...response, data: data || { tests: [] } };
  return response;
}
