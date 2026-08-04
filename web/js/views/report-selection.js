export function defaultReportTestIds(results) {
  return [...new Set((results || []).filter((result) => result.status === 'concluido').map((result) => result.testeId || result.testId))];
}
