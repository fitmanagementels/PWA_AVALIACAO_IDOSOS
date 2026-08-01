import { compareComparableResults } from '../history-domain.js';

export function historySummary(assessments) {
  return assessments.sort((a, b) => String(b.date).localeCompare(String(a.date))).map((assessment, index, all) => ({
    ...assessment,
    comparisons: (assessment.results || []).map((result) => {
      const prior = all.slice(index + 1).flatMap((item) => item.results || []).find((candidate) => candidate.testId === result.testId && candidate.side === result.side);
      return { result, comparison: prior ? compareComparableResults(prior, result) : { comparable: false, delta: null } };
    })
  }));
}
