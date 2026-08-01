function generateReport(payload) {
  const loaded = getAssessment(payload);
  if (!loaded.ok) return loaded;
  const person = getRows_(SHEETS.PEOPLE).find(function(row) { return row.pessoaId === loaded.data.assessment.pessoaId; });
  const model = buildReportModel_({ person: { name: person.nomeCompleto }, assessment: loaded.data.assessment, results: loaded.data.results });
  const title = 'Relatório - ' + person.nomeCompleto + ' - ' + loaded.data.assessment.data;
  const document = DocumentApp.create(title);
  const body = document.getBody();
  body.appendParagraph('RELATÓRIO DE AVALIAÇÃO FUNCIONAL').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(model.summary.personName + ' · ' + model.summary.date);
  body.appendParagraph('Resumo da avaliação').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  model.summary.domains.forEach(function(result) { body.appendParagraph(result.testId + ': ' + (result.value || 'Não concluído') + (result.classification ? ' · ' + result.classification : '')); });
  if (model.summary.studentObservations) { body.appendParagraph('Observações do profissional sobre o aluno').setHeading(DocumentApp.ParagraphHeading.HEADING2); body.appendParagraph(model.summary.studentObservations); }
  body.appendPageBreak(); body.appendParagraph('DETALHAMENTO TÉCNICO').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph('Profissional responsável: ' + model.technical.professionalName);
  const table = body.appendTable([['Teste', 'Resultado', 'Referência / motivo']]);
  model.technical.results.forEach(function(result) { table.appendTableRow().appendTableCell(result.testId).getParentRow().appendTableCell(result.value || 'Não concluído').getParentRow().appendTableCell(result.reason || result.classification); });
  body.appendParagraph('Este relatório apoia o acompanhamento físico e não substitui avaliação médica.');
  document.saveAndClose();
  const pdf = DriveApp.getFileById(document.getId()).getAs(MimeType.PDF).setName(title + '.pdf');
  const file = DriveApp.createFile(pdf);
  return jsonOk_({ fileId: file.getId(), fileName: file.getName(), url: file.getUrl() });
}

function buildReportModel_(input) {
  const results = input.results.map(function(result) { return { testId: result.testeId, status: result.status, officialValue: result.valorOficial, unit: result.unidade, classification: result.classificacao, motivoNaoConcluido: result.motivoNaoConcluido }; });
  const technical = results.map(function(result) { return { testId: result.testId, value: result.status === 'concluido' ? result.officialValue + ' ' + result.unit : null, classification: result.classification || 'Sem referência cadastrada', reason: result.status === 'naoConcluido' ? result.motivoNaoConcluido : null }; });
  return { summary: { personName: input.person.name, date: input.assessment.data, studentObservations: input.assessment.observacoesAluno || null, domains: technical }, technical: { professionalName: input.assessment.profissionalNome, results: technical } };
}
