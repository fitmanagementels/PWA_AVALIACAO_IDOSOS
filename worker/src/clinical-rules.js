function dateKey(value) {
  return String(value || '').slice(0, 10);
}

function numeric(value) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseCriteria(reference) {
  try {
    return JSON.parse(reference.criteriaJson || reference.criteria_json || '{}');
  } catch {
    return null;
  }
}

function activeReference(references, testId, assessmentDate) {
  const date = dateKey(assessmentDate);
  return (references || [])
    .filter((reference) => (reference.testId || reference.test_id) === testId && dateKey(reference.effectiveOn || reference.effective_on) <= date)
    .sort((left, right) => (
      dateKey(right.effectiveOn || right.effective_on).localeCompare(dateKey(left.effectiveOn || left.effective_on))
      || Number(right.version || 0) - Number(left.version || 0)
    ))[0] || null;
}

function savedApplication(value) {
  try {
    const parsed = JSON.parse(value || '');
    const range = parsed?.range || parsed?.faixa;
    const labels = parsed?.labels || parsed?.rotulos;
    if (!parsed || !range || !labels) return null;

    return {
      ...parsed,
      referenceId: parsed.referenceId || parsed.referenciaId || '',
      referenceVersion: Number(parsed.referenceVersion || parsed.referenciaVersao || 0),
      effectiveOn: parsed.effectiveOn || parsed.vigencia || '',
      model: parsed.model || parsed.modelo || '',
      source: parsed.source || parsed.fonte || '',
      ageAtAssessment: parsed.ageAtAssessment ?? parsed.idadeNaAvaliacao ?? null,
      ageRange: parsed.ageRange || parsed.faixaEtaria || null,
      range: { min: Number(range.min), max: Number(range.max), unit: range.unit || range.unidade || '' },
      labels: {
        below: labels.below || labels.abaixo || '',
        normal: labels.normal || '',
        above: labels.above || labels.acima || '',
      },
      classification: parsed.classification || parsed.classificacao || '',
    };
  } catch {
    return null;
  }
}

function classify(application, value) {
  if (!application || !Number.isFinite(value)) return application;
  const { range, labels } = application;
  const classification = value < range.min
    ? labels.below
    : value > range.max
      ? labels.above
      : labels.normal;

  return classification ? { ...application, classification } : application;
}

export function ageOnDate(birthDate, assessmentDate) {
  const [birthYear, birthMonth, birthDay] = dateKey(birthDate).split('-').map(Number);
  const [assessmentYear, assessmentMonth, assessmentDay] = dateKey(assessmentDate).split('-').map(Number);
  if (![birthYear, birthMonth, birthDay, assessmentYear, assessmentMonth, assessmentDay].every(Number.isFinite)) return null;

  return assessmentYear - birthYear - Number(
    assessmentMonth < birthMonth || (assessmentMonth === birthMonth && assessmentDay < birthDay),
  );
}

export function bestAttempt(values, direction) {
  const valid = (values || []).filter(Number.isFinite);
  if (!valid.length) return null;
  return direction === 'lowest' ? Math.min(...valid) : Math.max(...valid);
}

export function referenceApplicationForValue(references, input) {
  const value = numeric(input.value);
  const reference = activeReference(references, input.testId, input.assessmentDate);
  if (!reference || !Number.isFinite(value)) return null;

  const criteria = parseCriteria(reference);
  if (!criteria || criteria.modelo !== 'faixas-por-sexo-e-idade' || criteria.unidade !== input.unit) return null;

  const range = (criteria.faixas || []).find((item) => (
    item.sexo === input.sex && input.age >= item.idadeMin && input.age <= item.idadeMax
  ));
  if (!range) return null;

  const labels = criteria.rotulos || {};
  const application = {
    referenceId: reference.id || reference.referenciaId || reference.referencia_id || '',
    referenceVersion: Number(reference.version || reference.versao || 0),
    effectiveOn: dateKey(reference.effectiveOn || reference.effective_on || reference.vigencia),
    model: criteria.modelo,
    source: criteria.fonte || '',
    sex: input.sex,
    ageAtAssessment: input.age,
    ageRange: { min: range.idadeMin, max: range.idadeMax },
    range: { min: range.normalMin, max: range.normalMax, unit: criteria.unidade },
    labels: { below: labels.abaixo || '', normal: labels.normal || '', above: labels.acima || '' },
    classification: '',
  };

  return classify(application, value);
}

export function referenceForSavedResult(result, person, assessmentDate, references) {
  if (result.status !== 'concluido' || !person) return null;

  const stored = savedApplication(result.referenceApplicationJson || result.referenciaAplicadaJson);
  if (stored) return classify(stored, numeric(result.officialValue ?? result.valorOficial));

  return referenceApplicationForValue(references, {
    testId: result.testId || result.testeId,
    sex: person.sex || person.sexo,
    age: ageOnDate(person.birthDate || person.dataNascimento, assessmentDate),
    value: result.officialValue ?? result.valorOficial,
    unit: result.unit || result.unidade,
    assessmentDate,
  });
}
