function pickBestAttempt(values, direction) {
  const validValues = values.filter(Number.isFinite);
  if (!validValues.length) return null;
  return direction === 'lowest' ? Math.min.apply(null, validValues) : Math.max.apply(null, validValues);
}

function ageOnDate(birthDate, evaluationDate) {
  const birth = new Date(`${birthDate}T00:00:00Z`);
  const at = new Date(`${evaluationDate}T00:00:00Z`);
  return at.getUTCFullYear() - birth.getUTCFullYear() - Number(
    at.getUTCMonth() < birth.getUTCMonth() ||
    (at.getUTCMonth() === birth.getUTCMonth() && at.getUTCDate() < birth.getUTCDate())
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
  const reference = activeReference_(referenceRows, input.testId, input.assessmentDate);
  if (!reference || !Number.isFinite(input.value)) return null;
  let criteria;
  try { criteria = JSON.parse(reference.criteriosJson || '{}'); } catch (_) { return null; }
  if (criteria.modelo !== 'faixas-por-sexo-e-idade' || criteria.unidade !== input.unit) return null;
  const range = (criteria.faixas || []).find(function(item) {
    return item.sexo === input.sex && input.age >= item.idadeMin && input.age <= item.idadeMax;
  });
  if (!range) return null;
  if (input.value < range.normalMin) return criteria.rotulos && criteria.rotulos.abaixo || null;
  if (input.value > range.normalMax) return criteria.rotulos && criteria.rotulos.acima || null;
  return criteria.rotulos && criteria.rotulos.normal || null;
}
