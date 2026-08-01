const STEP_TEST_REFERENCES = {
  masculino: [
    [60, 64, 87, 115], [65, 69, 86, 116], [70, 74, 80, 110], [75, 79, 73, 109],
    [80, 84, 71, 103], [85, 89, 59, 91], [90, 94, 52, 86]
  ],
  feminino: [
    [60, 64, 75, 107], [65, 69, 73, 107], [70, 74, 68, 101], [75, 79, 68, 100],
    [80, 84, 60, 91], [85, 89, 55, 85], [90, 94, 44, 72]
  ]
};

export function pickBestAttempt(values, direction) {
  const validValues = values.filter(Number.isFinite);
  if (!validValues.length) return null;
  return direction === 'lowest' ? Math.min(...validValues) : Math.max(...validValues);
}

export function ageOnDate(birthDate, evaluationDate) {
  const birth = new Date(`${birthDate}T00:00:00Z`);
  const at = new Date(`${evaluationDate}T00:00:00Z`);
  return at.getUTCFullYear() - birth.getUTCFullYear() - Number(
    at.getUTCMonth() < birth.getUTCMonth() ||
    (at.getUTCMonth() === birth.getUTCMonth() && at.getUTCDate() < birth.getUTCDate())
  );
}

export function scoreGait4m(seconds) {
  if (!Number.isFinite(seconds)) return 0;
  if (seconds <= 4.82) return 4;
  if (seconds <= 6.2) return 3;
  if (seconds <= 8.7) return 2;
  return 1;
}

export function scoreStaticBalance({ feetTogether = 0, semiTandem = 0, tandem = 0, unableToAttempt = false }) {
  if (unableToAttempt) return 0;
  const positionsHeld = [feetTogether, semiTandem, tandem].filter((seconds) => seconds >= 10).length;
  return Math.max(1, positionsHeld + 1);
}

export function classifyStepTest({ sex, age, count }) {
  const range = STEP_TEST_REFERENCES[sex]?.find(([from, to]) => age >= from && age <= to);
  if (!range || !Number.isFinite(count)) return null;
  const [, , averageMinimum, averageMaximum] = range;
  if (count < averageMinimum) return 'abaixo da média';
  if (count > averageMaximum) return 'acima da média';
  return 'média';
}

export { STEP_TEST_REFERENCES };
