function pickBestAttempt(values, direction) {
  const validValues = values.filter(Number.isFinite);
  if (!validValues.length) return null;
  return direction === 'lowest' ? Math.min.apply(null, validValues) : Math.max.apply(null, validValues);
}

function datePartsForAge_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return { year: value.getFullYear(), month: value.getMonth() + 1, day: value.getDate() };
  }
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function ageOnDate(birthDate, evaluationDate) {
  const birth = datePartsForAge_(birthDate);
  const at = datePartsForAge_(evaluationDate);
  if (!birth || !at) return null;
  return at.year - birth.year - Number(
    at.month < birth.month ||
    (at.month === birth.month && at.day < birth.day)
  );
}

function scoreGait4m(seconds) {
  if (!Number.isFinite(seconds)) return 0;
  if (seconds <= 4.82) return 4;
  if (seconds <= 6.2) return 3;
  if (seconds <= 8.7) return 2;
  return 1;
}

function scoreStaticBalance(input) {
  if (input.unableToAttempt) return 0;
  const held = [input.feetTogether || 0, input.semiTandem || 0, input.tandem || 0].filter(function(seconds) { return seconds >= 10; }).length;
  return Math.max(1, held + 1);
}

function classifyStepTest(input) {
  const range = STEP_TEST_REFERENCES[input.sex] && STEP_TEST_REFERENCES[input.sex].find(function(item) {
    return input.age >= item.from && input.age <= item.to;
  });
  if (!range || !Number.isFinite(input.count)) return null;
  if (input.count < range.averageMinimum) return 'abaixo da média';
  if (input.count > range.averageMaximum) return 'acima da média';
  return 'média';
}

function referenceDateKey_(value) {
  if (value instanceof Date) return [value.getFullYear(), String(value.getMonth() + 1).padStart(2, '0'), String(value.getDate()).padStart(2, '0')].join('-');
  return String(value || '').slice(0, 10);
}

function activeReference_(rows, testId, assessmentDate) {
  const date = referenceDateKey_(assessmentDate);
  return (rows || []).filter(function(row) {
    return row.testeId === testId && referenceDateKey_(row.vigencia) <= date;
  }).sort(function(a, b) {
    return referenceDateKey_(b.vigencia).localeCompare(referenceDateKey_(a.vigencia)) || Number(b.versao || 0) - Number(a.versao || 0);
  })[0] || null;
}

function classifyReferenceValue_(referenceRows, input) {
  const application = referenceApplicationForValue_(referenceRows, input);
  return application ? application.classificacao : null;
}

function referenceApplicationForValue_(referenceRows, input) {
  const reference = activeReference_(referenceRows, input.testId, input.assessmentDate);
  if (!reference || !Number.isFinite(input.value)) return null;
  let criteria;
  try { criteria = JSON.parse(reference.criteriosJson || '{}'); } catch (_) { return null; }
  if (criteria.modelo !== 'faixas-por-sexo-e-idade' || criteria.unidade !== input.unit) return null;
  const range = (criteria.faixas || []).find(function(item) {
    return item.sexo === input.sex && input.age >= item.idadeMin && input.age <= item.idadeMax;
  });
  if (!range) return null;
  const rotulos = criteria.rotulos || {};
  const classificacao = input.value < range.normalMin ? rotulos.abaixo : input.value > range.normalMax ? rotulos.acima : rotulos.normal;
  if (!classificacao) return null;
  return {
    referenciaId: reference.referenciaId,
    referenciaVersao: Number(reference.versao || 0),
    vigencia: referenceDateKey_(reference.vigencia),
    modelo: criteria.modelo,
    fonte: criteria.fonte || '',
    sexo: input.sex,
    idadeNaAvaliacao: input.age,
    faixaEtaria: { min: range.idadeMin, max: range.idadeMax },
    faixa: { min: range.normalMin, max: range.normalMax, unidade: criteria.unidade },
    rotulos: { abaixo: rotulos.abaixo || '', normal: rotulos.normal || '', acima: rotulos.acima || '' },
    classificacao: classificacao
  };
}
