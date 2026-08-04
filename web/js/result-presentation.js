const STEP_REFERENCES = {
  masculino: [[60, 64, 87, 115], [65, 69, 86, 116], [70, 74, 80, 110], [75, 79, 73, 109], [80, 84, 71, 103], [85, 89, 59, 91], [90, 94, 52, 86]],
  feminino: [[60, 64, 75, 107], [65, 69, 73, 107], [70, 74, 68, 101], [75, 79, 68, 100], [80, 84, 60, 91], [85, 89, 55, 85], [90, 94, 44, 72]]
};

function ageOnDate(birthDate, assessmentDate) {
  const birth = new Date(`${birthDate}T00:00:00Z`);
  const at = new Date(`${assessmentDate}T00:00:00Z`);
  return at.getUTCFullYear() - birth.getUTCFullYear() - Number(at.getUTCMonth() < birth.getUTCMonth() || (at.getUTCMonth() === birth.getUTCMonth() && at.getUTCDate() < birth.getUTCDate()));
}

function stepClassification({ sex, age, count }) {
  const range = STEP_REFERENCES[sex]?.find(([from, to]) => age >= from && age <= to);
  if (!range || !Number.isFinite(count)) return null;
  return count < range[2] ? 'below' : 'within';
}

function valueOf(result) { return Object.values(result.officialBySide || {})[0] ?? null; }

export function presentationForResult({ result, person, assessmentDate }) {
  if (!result) return { state: 'gray', label: 'Não iniciado', officialText: null };
  if (result.status === 'naoConcluido') return { state: 'gray', label: 'Não concluído', officialText: null };
  const value = valueOf(result);
  const officialText = value === null ? null : `${value} ${result.unit}`;
  if (result.testId !== 'step-2min') return { state: 'gray', label: 'Sem referência disponível', officialText };
  const classification = stepClassification({ sex: person?.sex, age: ageOnDate(person?.birthDate, assessmentDate), count: value });
  if (!classification) return { state: 'gray', label: 'Sem referência disponível', officialText };
  return classification === 'below' ? { state: 'yellow', label: 'Abaixo da referência', officialText } : { state: 'green', label: 'Dentro da referência', officialText };
}

export function sessionColorCounts({ selectedTestIds, results, person, assessmentDate }) {
  return selectedTestIds.reduce((counts, testId) => {
    const result = results.find((item) => item.testId === testId);
    if (!result) counts.pending += 1;
    else counts[presentationForResult({ result, person, assessmentDate }).state] += 1;
    return counts;
  }, { green: 0, yellow: 0, gray: 0, pending: 0 });
}
