function required(value) {
  return String(value || '').trim();
}

export function validatePersonInput(input) {
  if (!required(input.fullName) || !required(input.birthDate) || !required(input.sex)) {
    throw new Error('Nome, data de nascimento e sexo são obrigatórios');
  }

  if (!['masculino', 'feminino'].includes(input.sex)) {
    throw new Error('Sexo inválido');
  }
}

export function validateAssessmentInput(input, professionals = []) {
  if (!required(input.personId) || !required(input.assessmentDate) || !required(input.professionalId)) {
    throw new Error('Profissional responsável é obrigatório');
  }

  if (professionals.length && !professionals.includes(input.professionalId)) {
    throw new Error('Profissional responsável é obrigatório');
  }

  const testIds = input.testIds || input.selectedTestIds;
  if (!Array.isArray(testIds) || !testIds.length) {
    throw new Error('Selecione ao menos um teste');
  }
}

export function validateCompletion({ selectedTestIds, results }) {
  const selected = selectedTestIds || [];
  const savedResults = results || [];

  if (selected.some((testId) => !savedResults.some((result) => result.testId === testId))) {
    throw new Error('Preencha ou informe o motivo para todos os testes selecionados');
  }

  for (const result of savedResults) {
    if (result.status === 'naoConcluido' && !required(result.reason || result.nonCompletionReason || result.motivoNaoConcluido)) {
      throw new Error('Informe o motivo do teste não concluído');
    }
  }
}
