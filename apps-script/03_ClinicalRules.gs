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
