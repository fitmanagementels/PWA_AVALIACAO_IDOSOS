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

export function groupHistoryByMonth(items) {
  return items.reduce((groups, item) => {
    const key = String(item.date || '').slice(0, 7) || 'sem-data';
    const current = groups[groups.length - 1];
    if (current?.key === key) current.items.push(item);
    else groups.push({ key, items: [item] });
    return groups;
  }, []);
}
