import { buildResult, markNotCompleted } from '../assessment-domain.js';
import { TESTS } from '../domain.js';
import { queueMutation } from '../storage.js';
import { assessmentForSave, measurementValue } from '../sync-model.js';

const TEST_DETAILS = {
  'back-scratch': { unit: 'cm', sides: true, attempts: 2, title: 'Back Scratch', hint: 'Registre a melhor distância (negativa, zero ou positiva) em cm para cada lado.' },
  'chair-sit-reach': { unit: 'cm', sides: true, attempts: 2, title: 'Chair Sit-and-Reach', hint: 'Registre a melhor distância em cm para cada perna.' },
  'step-2min': { unit: 'elevações', attempts: 1, title: '2-Minute Step Test', hint: 'Conte as elevações do joelho direito em dois minutos.' },
  'knee-extension-isometric': { unit: 'kgf', sides: true, attempts: 2, title: 'Extensão isométrica de joelho', hint: 'Dinamômetro de tensão. O protocolo clínico detalhado será configurado depois.' },
  'rowing-isometric': { unit: 'kgf', sides: true, attempts: 2, title: 'Remada isométrica', hint: 'Dinamômetro de tensão. O protocolo clínico detalhado será configurado depois.' }
};
const testName = (id) => TESTS.find(([testId]) => testId === id)?.[1] || id;
export function renderAssessmentEditor(root, assessment, onBack) {
  root.innerHTML = `<section class="screen-title"><div><p class="eyebrow">AVALIAÇÃO EM RASCUNHO</p><h1>${assessment.personName}</h1><p>${assessment.date} · ${assessment.professionalName}</p></div><button class="secondary" data-back>Voltar</button></section><form class="form-card assessment-form">${assessment.testIds.map(card).join('')}<label>Notas sobre os testes <small>Internas — não aparecem no relatório.</small><textarea name="testNotes">${assessment.testNotes || ''}</textarea></label><label>Observações do profissional sobre o aluno <small>Aparecem no relatório quando preenchidas.</small><textarea name="studentObservations">${assessment.studentObservations || ''}</textarea></label><button>Salvar rascunho</button><p class="form-message"></p></form>`;
  root.querySelector('[data-back]').onclick = onBack;
  root.querySelector('form').onsubmit = async (event) => { event.preventDefault(); try { const data = new FormData(event.currentTarget); assessment.results = assessment.testIds.map((id) => collectResult(id, data)); assessment.testNotes = data.get('testNotes'); assessment.studentObservations = data.get('studentObservations'); assessment.updatedAt = new Date().toISOString(); assessment.status = 'pendenteDeSincronizacao'; localStorage.setItem(`assessment:${assessment.id}`, JSON.stringify(assessment)); await queueMutation('saveAssessment', assessmentForSave(assessment)); root.querySelector('.form-message').textContent = 'Rascunho salvo neste aparelho e enviado para sincronização.'; } catch (error) { root.querySelector('.form-message').textContent = error.message; } };
}
function card(id) {
  if (id === 'sppb') return `<fieldset class="test-card"><legend>SPPB <small>Bloco único: os três componentes são obrigatórios.</small></legend><label>Caminhada 4 m — tentativa 1 (s)<input name="sppb-gait-1" inputmode="decimal"></label><label>Caminhada 4 m — tentativa 2 (s)<input name="sppb-gait-2" inputmode="decimal"></label><label>Sentar e levantar 5x (s)<input name="sppb-chair" inputmode="decimal"></label><label>Equilíbrio: pés juntos (s)<input name="sppb-feet" inputmode="decimal"></label><label>Equilíbrio: semi-tandem (s)<input name="sppb-semi" inputmode="decimal"></label><label>Equilíbrio: tandem (s)<input name="sppb-tandem" inputmode="decimal"></label></fieldset>`;
  const detail = TEST_DETAILS[id]; const sides = detail.sides ? ['direito', 'esquerdo'] : ['unico']; const inputs = sides.flatMap((side) => Array.from({ length: detail.attempts }, (_, index) => `<label>${side === 'unico' ? '' : `${side} · `}tentativa ${index + 1} (${detail.unit})<input name="${id}-${side}-${index + 1}" inputmode="decimal"></label>`)).join('');
  return `<fieldset class="test-card"><legend>${detail.title}</legend><p>${detail.hint}</p><label class="not-completed"><input type="checkbox" name="${id}-not-completed"> Não concluído</label><label>Motivo, se não concluído<input name="${id}-reason" placeholder="Dor, insegurança, intercorrência ou recusa"></label>${inputs}</fieldset>`;
}
function collectResult(id, data) {
  if (id === 'sppb') {
    const gaitAttempts = [data.get('sppb-gait-1'), data.get('sppb-gait-2')].map(measurementValue).filter((value) => value !== null);
    const chair = measurementValue(data.get('sppb-chair')); const balance = measurementValue(data.get('sppb-tandem'));
    if (!gaitAttempts.length || chair === null || balance === null) throw new Error('Preencha os campos necessários do SPPB ou conclua-o posteriormente.');
    return buildResult({ testId: id, unit: 'score', attempts: [{ side: 'caminhada4m', value: Math.min(...gaitAttempts) }, { side: 'sentarLevantar5x', value: chair }, { side: 'equilibrio', value: balance }] });
  }
  const detail = TEST_DETAILS[id]; const reason = data.get(`${id}-reason`); if (data.get(`${id}-not-completed`)) return markNotCompleted({ testId: id, reason });
  const attempts = (detail.sides ? ['direito', 'esquerdo'] : ['unico']).flatMap((side) => Array.from({ length: detail.attempts }, (_, index) => ({ side, value: measurementValue(data.get(`${id}-${side}-${index + 1}`)) })).filter((attempt) => attempt.value !== null));
  if (!attempts.length) return markNotCompleted({ testId: id, reason: reason || 'Resultado não informado' });
  return buildResult({ testId: id, unit: detail.unit, direction: id === 'step-2min' ? 'highest' : id.includes('sppb') ? 'lowest' : 'highest', attempts });
}
