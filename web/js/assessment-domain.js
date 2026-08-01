export function markNotCompleted({ testId, reason }) {
  if (!reason?.trim()) throw new Error('Informe o motivo do teste não concluído');
  return { testId, status: 'naoConcluido', reason: reason.trim(), attempts: [] };
}

export function buildResult({ testId, unit, direction = 'highest', attempts }) {
  const bySide = attempts.reduce((groups, attempt) => {
    if (Number.isFinite(Number(attempt.value))) (groups[attempt.side || 'unico'] ||= []).push(Number(attempt.value));
    return groups;
  }, {});
  const best = (values) => direction === 'lowest' ? Math.min(...values) : Math.max(...values);
  return { testId, status: 'concluido', unit, attempts, officialBySide: Object.fromEntries(Object.entries(bySide).map(([side, values]) => [side, best(values)])) };
}
