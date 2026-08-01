export function buildReportModel({ person, assessment, results }) {
  const technicalResults = results.map((result) => ({
    testId: result.testId,
    status: result.status,
    value: result.status === 'concluido' ? `${result.officialValue} ${result.unit}` : null,
    classification: result.classification || 'Sem referência cadastrada',
    reason: result.status === 'naoConcluido' ? result.reason || result.motivoNaoConcluido : null
  }));
  return {
    summary: { personName: person.name, date: assessment.date, studentObservations: assessment.studentObservations || null, domains: technicalResults },
    technical: { professionalName: assessment.professionalName, results: technicalResults }
  };
}
