import { addSelectedTests, assessmentReadiness, buildResult, markNotCompleted } from '../assessment-domain.js';
import { TESTS } from '../domain.js';
import { presentationForResult, sessionColorCounts } from '../result-presentation.js';
import { enqueueAssessmentMutation, saveDraft } from '../storage.js';
import { assessmentForSave, measurementValue } from '../sync-model.js';
import { formatDateBr } from '../date-format.js';
import { draftInputsForTest, replaceTestDraftInputs, testCardSummary, testDefinition } from '../test-inputs.js';
import { bindSelectionSummary, selectionCardsMarkup } from './selection-controls.js';
import { openTestSheet } from './test-sheet.js';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));

export function renderAssessmentEditor(root, assessment, onBack) {
  assessment.draftInputs ||= {};
  const person = { sex: assessment.personSex, birthDate: assessment.personBirthDate };
  const counts = sessionColorCounts({ selectedTestIds: assessment.testIds, results: assessment.results || [], person, assessmentDate: assessment.date });
  const availableTests = TESTS.filter(([id]) => !assessment.testIds.includes(id));
  root.innerHTML = `<section class="screen-title"><div><p class="eyebrow">${assessment.status === 'concluida' ? 'AVALIAÇÃO CONCLUÍDA' : 'AVALIAÇÃO EM RASCUNHO'}</p><h1>${escapeHtml(assessment.personName)}</h1><p>${formatDateBr(assessment.date)} · ${escapeHtml(assessment.professionalName)}</p></div><button class="secondary" data-back>Voltar</button></section><form class="form-card assessment-form"><section class="session-summary" aria-label="Resumo da sessão"><span class="state-chip green">${counts.green} verdes</span><span class="state-chip yellow">${counts.yellow} amarelos</span><span class="state-chip gray">${counts.gray} cinzas</span><span class="state-chip neutral">${counts.pending} pendentes</span></section><details class="add-tests" open><summary><strong>Complementar esta avaliação</strong><small>Inclua outros testes sem perder o que já foi registrado.</small></summary>${availableTests.length ? `<p class="selection-summary" data-selection-summary="additional"></p><div class="selection-list">${selectionCardsMarkup({ name: 'additionalTestIds', items: availableTests })}</div><button class="secondary" type="button" data-add-tests data-selection-action="additional">Adicionar testes selecionados</button>` : `<p class="add-tests__empty">Todos os ${TESTS.length} testes atualmente cadastrados já foram incluídos nesta avaliação.</p>`}</details><section class="test-summary-list" aria-label="Testes da avaliação">${assessment.testIds.map((id) => testSummaryCard(id, assessment, person)).join('')}</section><label>Notas sobre os testes <small>Internas — não aparecem no relatório.</small><textarea name="testNotes">${escapeHtml(assessment.draftInputs.testNotes ?? assessment.testNotes ?? '')}</textarea></label><label>Observações do profissional sobre o aluno <small>Aparecem no relatório quando preenchidas.</small><textarea name="studentObservations">${escapeHtml(assessment.draftInputs.studentObservations ?? assessment.studentObservations ?? '')}</textarea></label><section class="action-grid"><button name="action" value="save" data-action="save">Salvar e sincronizar</button><button class="secondary" name="action" value="complete" data-action="complete">Concluir avaliação</button></section><p class="form-message" aria-live="polite"></p></form>`;
  const form = root.querySelector('form');
  if (availableTests.length) bindSelectionSummary(form, { inputName: 'additionalTestIds', summarySelector: '[data-selection-summary="additional"]', buttonSelector: '[data-selection-action="additional"]', idleLabel: 'Adicionar testes selecionados', selectedLabel: 'Adicionar testes' });
  root.querySelector('[data-back]').onclick = onBack;

  const persistAssessment = async () => {
    assessment.updatedAt = new Date().toISOString();
    localStorage.setItem(`assessment:${assessment.id}`, JSON.stringify(assessment));
    await saveDraft(assessment);
  };
  const persistDraft = async () => {
    const data = new FormData(form);
    assessment.draftInputs = {
      ...assessment.draftInputs,
      testNotes: data.get('testNotes') || '',
      studentObservations: data.get('studentObservations') || '',
    };
    await persistAssessment();
  };
  const openTest = (id, origin) => {
    const result = (assessment.results || []).find((item) => item.testId === id) || null;
    const definition = testDefinition(id);
    assessment.hydratedTestIds ||= [];
    if (!assessment.hydratedTestIds.includes(id)) {
      assessment.draftInputs = { ...assessment.draftInputs, ...draftInputsForTest({ testId: id, draftInputs: assessment.draftInputs, result }) };
      assessment.hydratedTestIds.push(id);
    }
    const summary = testCardSummary({ testId: id, draftInputs: assessment.draftInputs, result });
    openTestSheet({
      origin,
      testId: id,
      definition,
      draftInputs: assessment.draftInputs,
      summary,
      persist: async (values) => {
        assessment.draftInputs = replaceTestDraftInputs(assessment.draftInputs, id, values);
        await persistAssessment();
      },
      onClose: () => {
        const scrollY = window.scrollY;
        renderAssessmentEditor(root, assessment, onBack);
        const replacement = root.querySelector(`[data-open-test="${id}"]`);
        requestAnimationFrame(() => {
          window.scrollTo({ top: scrollY });
          replacement?.focus();
        });
      },
    });
  };

  root.querySelectorAll('[data-open-test]').forEach((button) => button.addEventListener('click', () => openTest(button.dataset.openTest, button)));
  form.addEventListener('input', () => { persistDraft().catch(() => {}); });
  form.addEventListener('change', () => { persistDraft().catch(() => {}); });
  form.querySelector('[data-add-tests]')?.addEventListener('click', async () => {
    const additions = new FormData(form).getAll('additionalTestIds');
    if (!additions.length) return;
    assessment.testIds = addSelectedTests(assessment.testIds, additions);
    await persistDraft();
    renderAssessmentEditor(root, assessment, onBack);
  });
  form.onsubmit = async (event) => {
    event.preventDefault();
    const message = form.querySelector('.form-message');
    try {
      await persistDraft();
      const data = formDataForDraftInputs(assessment.draftInputs);
      const collected = assessment.testIds.map((id) => collectResult(id, data));
      assessment.results = assessment.testIds.map((id, index) => collected[index] || (assessment.results || []).find((item) => item.testId === id)).filter(Boolean);
      assessment.testNotes = data.get('testNotes') || '';
      assessment.studentObservations = data.get('studentObservations') || '';
      await persistAssessment();
      const action = event.submitter?.value || 'save';
      if (action === 'complete') {
        const readiness = assessmentReadiness(assessment);
        if (!readiness.ready) throw new Error(readiness.message);
      }
      await enqueueAssessmentMutation(assessment.id, action === 'complete' ? 'completeAssessment' : 'saveAssessment', assessmentForSave(assessment));
      const sync = await window.syncNow();
      if (action === 'complete' && sync?.ok) {
        assessment.status = 'concluida';
        await persistAssessment();
        message.textContent = 'Avaliação concluída e sincronizada.';
      } else message.textContent = sync?.ok ? 'Rascunho salvo e sincronizado.' : 'Rascunho salvo neste aparelho; envio pendente.';
    } catch (error) { message.textContent = error.message; }
  };
}

function testSummaryCard(id, assessment, person) {
  const result = (assessment.results || []).find((item) => item.testId === id) || null;
  const presentation = presentationForResult({ result, person, assessmentDate: assessment.date });
  const summary = testCardSummary({ testId: id, draftInputs: assessment.draftInputs, result });
  const definition = testDefinition(id);
  return `<button class="test-summary-card" type="button" data-open-test="${escapeHtml(id)}" data-state="${escapeHtml(presentation.state)}"><span class="test-summary-card__content"><strong>${escapeHtml(definition.title)}</strong><small>${escapeHtml(summary.text)}</small></span><span class="test-summary-card__meta"><i class="state-marker" aria-label="${escapeHtml(presentation.label)}"></i><small>${summary.entered} de ${summary.total}</small><b>Abrir ›</b></span></button>`;
}

function formDataForDraftInputs(draftInputs) {
  const data = new FormData();
  Object.entries(draftInputs).forEach(([name, value]) => data.append(name, value));
  return data;
}

function collectResult(id, data) {
  if (id === 'sppb') {
    if (data.get('sppb-not-completed')) return markNotCompleted({ testId: id, reason: data.get('sppb-reason') });
    const gaitAttempts = [data.get('sppb-gait-1'), data.get('sppb-gait-2')].map(measurementValue).filter((value) => value !== null);
    const chair = measurementValue(data.get('sppb-chair'));
    const balance = measurementValue(data.get('sppb-tandem'));
    if (!gaitAttempts.length || chair === null || balance === null) return null;
    return buildResult({ testId: id, unit: 'score', direction: 'lowest', attempts: [{ side: 'caminhada4m', value: Math.min(...gaitAttempts) }, { side: 'sentarLevantar5x', value: chair }, { side: 'equilibrio', value: balance }] });
  }
  const definition = testDefinition(id);
  const reason = data.get(`${id}-reason`);
  if (data.get(`${id}-not-completed`)) return markNotCompleted({ testId: id, reason });
  const attempts = definition.sides.flatMap((side) => Array.from({ length: definition.attempts }, (_, index) => ({ side, value: measurementValue(data.get(`${id}-${side}-${index + 1}`)) })).filter((attempt) => attempt.value !== null));
  if (!attempts.length) return null;
  return buildResult({ testId: id, unit: definition.unit, direction: 'highest', attempts });
}
