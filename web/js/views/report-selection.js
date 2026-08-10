export function reportableResults(results) {
  return (results || []).filter((result) => result.status === 'concluido');
}

export function defaultReportTestIds(results) {
  return [...new Set(reportableResults(results).map((result) => result.testeId || result.testId).filter(Boolean))];
}
