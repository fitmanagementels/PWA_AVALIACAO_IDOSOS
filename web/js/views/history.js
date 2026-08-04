import { sessionColorCounts } from '../result-presentation.js';

export function historyTimeline(records, person) {
  return [...records].sort((a, b) => String(b.assessment.date).localeCompare(String(a.assessment.date))).map(({ assessment, results }) => ({
    assessmentId: assessment.id,
    date: assessment.date,
    professionalName: assessment.professionalName,
    status: assessment.status,
    testIds: assessment.testIds || [],
    colors: sessionColorCounts({ selectedTestIds: assessment.testIds || [], results: results || [], person, assessmentDate: assessment.date })
  }));
}
