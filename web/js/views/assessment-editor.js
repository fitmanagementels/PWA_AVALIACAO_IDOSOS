import { addSelectedTests, assessmentReadiness, buildResult, markNotCompleted } from '../assessment-domain.js';
import { TESTS } from '../domain.js';
import { presentationForResult, sessionColorCounts } from '../result-presentation.js';
import { enqueueAssessmentMutation, saveDraft } from '../storage.js';
import { assessmentForSave, measurementValue } from '../sync-model.js';
import { formatDateBr } from '../date-format.js';

const TEST_DETAILS = {
  'back-scratch': { unit: 'cm', sides: true, attempts: 2, title: 'Back Scratch', hint: 'Registre a melhor distância em cm para cada lado.' },
  'chair-sit-reach': { unit: 'cm', sides: true, attempts: 2, title: 'Chair Sit-and-Reach', hint: 'Registre a melhor distância em cm para cada perna.' },
  'step-2min': { unit: 'elevações', attempts: 1, title: '2-Minute Step Test', hint: 'Conte as elevações do joelho direito em dois minutos.' },
  'knee-extension-isometric': { unit: 'kgf', sides: true, attempts: 2, title: 'Extensão isométrica de joelho', hint: 'Dinamômetro de tensão.' },
  'rowing-isometric': { unit: 'kgf', sides: true, attempts: 2, title: 'Remada isométrica', hint: 'Dinamômetro de tensão.' }
};

const testName = (id) => TESTS.find(([testId]) => testId === id)?.[1] || id;
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
const valueAttribute = (inputs, name) => ` value="${escapeHtml(inputs[name] || '')}"`;
const checkedAttribute = (inputs, name) => inputs[name] === 'on' ? ' checked' : '';

export function renderAssessmentEditor(root, assessment, onBack) {
  assessment.draftInputs ||= {};
  const person = { sex: assessment.personSex, birthDate: assessment.personBirthDate };
  const counts = sessionColorCounts({ selectedTestIds: assessment.testIds, results: assessment.results || [], person, assessmentDate: assessment.date });
  root.innerHTML = `<section class="screen-title"><div><p class="eyebrow">${assessment.status === 'concluida' ? 'AVALIAÇÃO CONCLUÍDA' : 'AVALIAÇÃO EM RASCUNHO'}</p><h1>${escapeHtml(assessment.personName)}</h1><p>${formatDateBr(assessment.date)} · ${escapeHtml(assessment.professionalName)}</p></div><button class="secondary" data-back>Voltar</button></section><form class="form-card assessment-form"><section class="session-summary" aria-label="Resumo da sessão"><span class="state-chip green">${counts.green} verdes</span><span class="state-chip yellow">${counts.yellow} amarelos</span><span class="state-chip gray">${counts.gray} cinzas</span><span class="state-chip neutral">${counts.pending} pendentes</span></section>${assessment.testIds.map((id) => card(id, assessment, person)).join('')}<details class="add-tests"><summary>Adicionar testes a esta avaliação</summary>${TESTS.filter(([id]) => !assessment.testIds.includes(id)).map(([id, title]) => `<label class="check-option"><input type="checkbox" name="additionalTestIds" value="${id}"><span>${title}</span></label>`).join('') || '<p>Todos os testes disponíveis já foram incluídos.</p>'}<button class="secondary" type="button" data-add-tests>Adicionar testes selecionados</button></details><label>Notas sobre os testes <small>Internas — não aparecem no relatório.</small><textarea name="testNotes">${escapeHtml(assessment.draftInputs.testNotes ?? assessment.testNotes ?? '')}</textarea></label><label>Observações do profissional sobre o aluno <small>Aparecem no relatório quando preenchidas.</small><textarea name="studentObservations">${escapeHtml(assessment.draftInputs.studentObservations ?? assessment.studentObservations ?? '')}</textarea></label><section class="action-grid"><button name="action" value="save" data-action="save">Salvar e sincronizar</button><button class="secondary" name="action" value="complete" data-action="complete">Concluir avaliação</button></section><p class="form-message" aria-live="polite"></p></form>`;
  const form = root.querySelector('form');
  root.querySelector('[data-back]').onclick = onBack;
  const persistDraft = async () => {
    assessment.draftInputs = Object.fromEntries(new FormData(form));
    assessment.updatedAt = new Date().toISOString();
    localStorage.setItem(`assessment:${assessment.id}`, JSON.stringify(assessment));
    await saveDraft(assessment);
  };
  form.addEventListener('input', () => { persistDraft().catch(() => {}); });
  form.addEventListener('change', () => { persistDraft().catch(() => {}); });
  form.addEventListener('toggle', (event) => {
    const current = event.target;
    if (current.matches('details.test-card') && current.open) form.querySelectorAll('details.test-card[open]').forEach((item) => { if (item !== current) item.open = false; });
  }, true);
  form.querySelector('[data-add-tests]').onclick = async () => {
    const additions = new FormData(form).getAll('additionalTestIds');
    if (!additions.length) return;
    assessment.testIds = addSelectedTests(assessment.testIds, additions);
    await persistDraft();
    renderAssessmentEditor(root, assessment, onBack);
  };
  form.onsubmit = async (event) => {
    event.preventDefault();
    const message = form.querySelector('.form-message');
    try {
      await persistDraft();
      const data = new FormData(form);
      const collected = assessment.testIds.map((id) => collectResult(id, data));
      assessment.results = assessment.testIds.map((id, index) => collected[index] || (assessment.results || []).find((item) => item.testId === id)).filter(Boolean);
      assessment.testNotes = data.get('testNotes') || '';
      assessment.studentObservations = data.get('studentObservations') || '';
      assessment.updatedAt = new Date().toISOString();
      localStorage.setItem(`assessment:${assessment.id}`, JSON.stringify(assessment));
      await saveDraft(assessment);
      const action = event.submitter?.value || 'save';
      if (action === 'complete') {
        const readiness = assessmentReadiness(assessment);
        if (!readiness.ready) throw new Error(readiness.message);
      }
      await enqueueAssessmentMutation(assessment.id, action === 'complete' ? 'completeAssessment' : 'saveAssessment', assessmentForSave(assessment));
      const sync = await window.syncNow();
      if (action === 'complete' && sync?.ok) {
        assessment.status = 'concluida';
        localStorage.setItem(`assessment:${assessment.id}`, JSON.stringify(assessment));
        await saveDraft(assessment);
        message.textContent = 'Avaliação concluída e sincronizada.';
      } else message.textContent = sync?.ok ? 'Rascunho salvo e sincronizado.' : 'Rascunho salvo neste aparelho; envio pendente.';
    } catch (error) { message.textContent = error.message; }
  };
}

function card(id, assessment, person) {
  const result = (assessment.results || []).find((item) => item.testId === id);
  const presentation = presentationForResult({ result, person, assessmentDate: assessment.date });
  const inputs = assessment.draftInputs || {};
  if (id === 'sppb') return `<details class="test-card" data-test-id="${id}" data-state="${presentation.state}"><summary><span>SPPB</span><i class="state-marker" aria-label="${presentation.label}"></i></summary><p>Bloco único: preencha os três componentes.</p><label class="not-completed"><input type="checkbox" name="sppb-not-completed"${checkedAttribute(inputs, 'sppb-not-completed')}> Não concluído</label><label>Motivo, se não concluído<input name="sppb-reason" placeholder="Dor, insegurança, intercorrência ou recusa"${valueAttribute(inputs, 'sppb-reason')}></label><label>Caminhada 4 m — tentativa 1 (s)<input name="sppb-gait-1" inputmode="decimal"${valueAttribute(inputs, 'sppb-gait-1')}></label><label>Caminhada 4 m — tentativa 2 (s)<input name="sppb-gait-2" inputmode="decimal"${valueAttribute(inputs, 'sppb-gait-2')}></label><label>Sentar e levantar 5x (s)<input name="sppb-chair" inputmode="decimal"${valueAttribute(inputs, 'sppb-chair')}></label><label>Equilíbrio: pés juntos (s)<input name="sppb-feet" inputmode="decimal"${valueAttribute(inputs, 'sppb-feet')}></label><label>Equilíbrio: semi-tandem (s)<input name="sppb-semi" inputmode="decimal"${valueAttribute(inputs, 'sppb-semi')}></label><label>Equilíbrio: tandem (s)<input name="sppb-tandem" inputmode="decimal"${valueAttribute(inputs, 'sppb-tandem')}></label>${result ? `<p class="result-caption">${presentation.officialText || presentation.label} · ${presentation.label}</p>` : ''}</details>`;
  const detail = TEST_DETAILS[id];
  const sides = detail.sides ? ['direito', 'esquerdo'] : ['unico'];
  const fields = sides.flatMap((side) => Array.from({ length: detail.attempts }, (_, index) => `<label>${side === 'unico' ? '' : `${side} · `}tentativa ${index + 1} (${detail.unit})<input name="${id}-${side}-${index + 1}" inputmode="decimal"${valueAttribute(inputs, `${id}-${side}-${index + 1}`)}></label>`)).join('');
  return `<details class="test-card" data-test-id="${id}" data-state="${presentation.state}"><summary><span>${escapeHtml(detail.title || testName(id))}</span><i class="state-marker" aria-label="${presentation.label}"></i></summary><p>${detail.hint}</p><label class="not-completed"><input type="checkbox" name="${id}-not-completed"${checkedAttribute(inputs, `${id}-not-completed`)}> Não concluído</label><label>Motivo, se não concluído<input name="${id}-reason" placeholder="Dor, insegurança, intercorrência ou recusa"${valueAttribute(inputs, `${id}-reason`)}></label>${fields}${result ? `<p class="result-caption">${presentation.officialText || presentation.label} · ${presentation.label}</p>` : ''}</details>`;
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
  const detail = TEST_DETAILS[id];
  const reason = data.get(`${id}-reason`);
  if (data.get(`${id}-not-completed`)) return markNotCompleted({ testId: id, reason });
  const attempts = (detail.sides ? ['direito', 'esquerdo'] : ['unico']).flatMap((side) => Array.from({ length: detail.attempts }, (_, index) => ({ side, value: measurementValue(data.get(`${id}-${side}-${index + 1}`)) })).filter((attempt) => attempt.value !== null));
  if (!attempts.length) return null;
  return buildResult({ testId: id, unit: detail.unit, direction: 'highest', attempts });
}
