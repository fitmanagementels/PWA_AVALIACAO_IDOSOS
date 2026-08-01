const PROFESSIONALS = new Set(['Elohim', 'Victor', 'Lucas', 'Carlos Eduardo']);

export function validateAssessmentDraft(assessment) {
  if (!assessment?.personId || !assessment?.date || !assessment?.assessmentId || !PROFESSIONALS.has(assessment.professionalName)) {
    return { ok: false, message: 'Profissional responsável é obrigatório' };
  }
  if (!Array.isArray(assessment.selectedTestIds) || !assessment.selectedTestIds.length) {
    return { ok: false, message: 'Selecione ao menos um teste' };
  }
  for (const result of assessment.results || []) {
    if (!assessment.selectedTestIds.includes(result.testId)) return { ok: false, message: 'Resultado contém teste não selecionado' };
    if (result.status === 'naoConcluido' && !result.reason?.trim()) return { ok: false, message: 'Informe o motivo do teste não concluído' };
    if (result.status === 'concluido' && !Number.isFinite(result.officialValue)) return { ok: false, message: 'Informe o resultado oficial do teste concluído' };
  }
  return { ok: true };
}
