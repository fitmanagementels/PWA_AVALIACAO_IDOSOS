import { PROFESSIONALS, TESTS, buildAssessmentStart, whatsAppUrl } from '../domain.js';
import { renderAssessmentEditor } from './assessment-editor.js';
import { historyTimeline } from './history.js';
import { defaultReportTestIds } from './report-selection.js';
import { queueMutation } from '../storage.js';
import { assessmentForCreate, assessmentFromApi, personForSave, personFromApi, resultsFromApi } from '../sync-model.js';
import { request } from '../api-client.js';
const key = 'avaliacao-idosos-people';
const read = () => JSON.parse(localStorage.getItem(key) || '[]');
const write = (items) => localStorage.setItem(key, JSON.stringify(items));
export function replacePeopleFromApi(records) { write(records.map(personFromApi)); }
export function renderPeople(root) {
  const people = read();
  root.innerHTML = `<section class="screen-title"><div><p class="eyebrow">AVALIAÇÃO FUNCIONAL</p><h1>Pessoas</h1><p>Encontre um aluno ou crie um cadastro.</p></div><button data-new>Nova pessoa</button></section><section class="list">${people.length ? people.map((p) => `<button class="person-card" data-id="${p.id}"><strong>${p.name}</strong><span>${p.birthDate} · ${p.sex}</span></button>`).join('') : '<article class="empty-state"><h2>Nenhuma pessoa cadastrada</h2><p>Cadastre o primeiro aluno para iniciar uma avaliação.</p></article>'}</section>`;
  root.querySelector('[data-new]').onclick = () => renderPersonForm(root);
  root.querySelectorAll('[data-id]').forEach((button) => button.onclick = () => renderPerson(root, button.dataset.id));
}
function renderPersonForm(root) {
  root.innerHTML = `<section class="screen-title"><div><p class="eyebrow">NOVO CADASTRO</p><h1>Pessoa avaliada</h1></div><button class="secondary" data-back>Voltar</button></section><form class="form-card"><label>Nome completo<input name="name" required></label><label>Data de nascimento<input name="birthDate" type="date" required></label><label>Sexo<select name="sex" required><option value="">Selecione</option><option value="masculino">Masculino</option><option value="feminino">Feminino</option></select></label><label>WhatsApp (opcional)<input name="whatsapp" inputmode="tel"></label><button>Salvar pessoa</button></form>`;
  root.querySelector('[data-back]').onclick = () => renderPeople(root);
  root.querySelector('form').onsubmit = async (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const person = { id: crypto.randomUUID(), name: data.get('name').trim(), birthDate: data.get('birthDate'), sex: data.get('sex'), whatsapp: String(data.get('whatsapp')).replace(/\D/g, '') }; write([...read(), person]); await queueMutation('savePerson', personForSave(person)); renderPerson(root, person.id); };
}
function renderPerson(root, id) {
  const person = read().find((item) => item.id === id); if (!person) return renderPeople(root); const link = whatsAppUrl(person.whatsapp);
  root.innerHTML = `<section class="screen-title"><div><p class="eyebrow">PESSOA AVALIADA</p><h1>${person.name}</h1><p>${person.birthDate} · ${person.sex}</p></div><button class="secondary" data-back>Voltar</button></section><section class="action-grid"><button data-start>+ Nova avaliação</button><button class="secondary" data-resume>↺ Retomar rascunho</button><button class="secondary" data-history>↗ Histórico</button></section>${link ? `<a class="whatsapp-link" href="${link}" target="_blank" rel="noopener">Abrir conversa no WhatsApp</a>` : '<p class="muted">Sem WhatsApp cadastrado.</p>'}`;
  root.querySelector('[data-back]').onclick = () => renderPeople(root); root.querySelector('[data-start]').onclick = () => renderStart(root, person); root.querySelector('[data-resume]').onclick = () => resumeLatestDraft(root, person); root.querySelector('[data-history]').onclick = () => renderHistory(root, person);
}

function localAssessmentsFor(personId) {
  return Object.keys(localStorage).filter((key) => key.startsWith('assessment:')).map((key) => JSON.parse(localStorage.getItem(key))).filter((assessment) => assessment.personId === personId);
}
function resumeLatestDraft(root, person) {
  const assessment = localAssessmentsFor(person.id).sort((a, b) => String(b.updatedAt || b.date).localeCompare(String(a.updatedAt || a.date)))[0];
  if (!assessment) return alert('Nenhum rascunho neste aparelho. Consulte o histórico para avaliações já sincronizadas.');
  renderAssessmentEditor(root, assessment, () => renderPerson(root, person.id));
}
async function renderHistory(root, person) {
  root.innerHTML = `<section class="screen-title"><div><p class="eyebrow">HISTÓRICO COMPARTILHADO</p><h1>${person.name}</h1><p>Carregando avaliações salvas na planilha…</p></div><button class="secondary" data-back>Voltar</button></section>`;
  root.querySelector('[data-back]').onclick = () => renderPerson(root, person.id);
  try {
    const response = await request('getHistory', { pessoaId: person.id }, 'GET');
    const records = response.data.map((item) => ({ assessment: assessmentFromApi(item.assessment), results: resultsFromApi(item.results) }));
    const assessments = historyTimeline(records, person);
    root.innerHTML = `<section class="screen-title"><div><p class="eyebrow">HISTÓRICO COMPARTILHADO</p><h1>${person.name}</h1><p>${assessments.length ? 'Selecione uma avaliação para ver os resultados.' : 'Ainda não há avaliações sincronizadas.'}</p></div><button class="secondary" data-back>Voltar</button></section>${assessments.length ? `<section class="list">${assessments.map((assessment) => `<button class="person-card" data-assessment-id="${assessment.assessmentId}"><strong>${assessment.date}</strong><span>${assessment.professionalName} · ${assessment.status} · ${assessment.colors.green} verdes · ${assessment.colors.yellow} amarelos · ${assessment.colors.gray} cinzas</span></button>`).join('')}</section>` : '<article class="empty-state"><h2>Sem avaliações salvas</h2><p>Os rascunhos deste aparelho podem ser retomados na tela anterior.</p></article>'}`;
    root.querySelector('[data-back]').onclick = () => renderPerson(root, person.id);
    root.querySelectorAll('[data-assessment-id]').forEach((button) => button.onclick = () => renderAssessmentHistory(root, person, button.dataset.assessmentId));
  } catch (error) {
    root.querySelector('.screen-title p:not(.eyebrow)').textContent = `Não foi possível carregar o histórico: ${error.message}`;
  }
}
async function renderAssessmentHistory(root, person, assessmentId) {
  root.innerHTML = `<section class="screen-title"><div><p class="eyebrow">AVALIAÇÃO SALVA</p><h1>${person.name}</h1><p>Carregando resultados…</p></div><button class="secondary" data-back>Voltar</button></section>`;
  root.querySelector('[data-back]').onclick = () => renderHistory(root, person);
  try {
    const response = await request('getAssessment', { avaliacaoId: assessmentId }, 'GET');
    const assessment = assessmentFromApi(response.data.assessment);
    const results = response.data.results;
    root.innerHTML = `<section class="screen-title"><div><p class="eyebrow">AVALIAÇÃO SALVA</p><h1>${assessment.date}</h1><p>${assessment.professionalName} · ${assessment.status}</p></div><button class="secondary" data-back>Voltar</button></section><section class="list">${results.length ? results.map((result) => `<article class="empty-state"><strong>${testName(result.testeId)}${result.lado ? ` · ${result.lado}` : ''}</strong><p>${result.status === 'naoConcluido' ? `Não concluído: ${result.motivoNaoConcluido}` : `${result.valorOficial} ${result.unidade}${result.classificacao ? ` · ${result.classificacao}` : ''}`}</p></article>`).join('') : '<article class="empty-state"><p>Sem resultados registrados.</p></article>'}</section><section class="action-grid"><button class="secondary" data-edit>Editar e complementar</button><button data-report>Exportar relatório PDF</button></section><p class="form-message"></p>`;
    root.querySelector('[data-back]').onclick = () => renderHistory(root, person);
    root.querySelector('[data-edit]').onclick = () => {
      const editable = { ...assessment, personName: person.name, personSex: person.sex, personBirthDate: person.birthDate, results: resultsFromApi(results) };
      localStorage.setItem(`assessment:${editable.id}`, JSON.stringify(editable));
      renderAssessmentEditor(root, editable, () => renderAssessmentHistory(root, person, assessment.id));
    };
    root.querySelector('[data-report]').onclick = () => {
      const selected = defaultReportTestIds(results);
      const target = root.querySelector('.action-grid');
      target.innerHTML = `<form class="form-card report-selection"><strong>Testes no relatório</strong>${assessment.testIds.map((id) => `<label class="check-option"><input type="checkbox" name="includedTestIds" value="${id}"${selected.includes(id) ? ' checked' : ''}><span>${testName(id)}</span></label>`).join('')}<button>Gerar relatório PDF</button></form>`;
      target.querySelector('form').onsubmit = async (event) => {
        event.preventDefault(); const message = root.querySelector('.form-message'); message.textContent = 'Gerando relatório…';
        try { const report = await request('generateReport', { avaliacaoId: assessment.id, includedTestIds: new FormData(event.currentTarget).getAll('includedTestIds') }); message.textContent = 'Relatório gerado. Abrindo arquivo…'; window.open(report.data.url, '_blank', 'noopener'); } catch (error) { message.textContent = error.message; }
      };
    };
  } catch (error) {
    root.querySelector('.screen-title p:not(.eyebrow)').textContent = `Não foi possível carregar esta avaliação: ${error.message}`;
  }
}
function renderStart(root, person) {
  root.innerHTML = `<section class="screen-title"><div><p class="eyebrow">NOVA AVALIAÇÃO</p><h1>${person.name}</h1><p>Escolha os testes desta sessão.</p></div><button class="secondary" data-back>Voltar</button></section><form class="form-card"><label>Data<input name="date" type="date" value="${new Date().toISOString().slice(0, 10)}" required></label><label>Profissional<select name="professionalName" required><option value="">Selecione</option>${PROFESSIONALS.map((name) => `<option>${name}</option>`).join('')}</select></label><fieldset><legend>Testes</legend>${TESTS.map(([id, name]) => `<label class="check-option"><input type="checkbox" name="testIds" value="${id}"><span>${name}</span></label>`).join('')}</fieldset><button>Iniciar avaliação</button><p class="form-message"></p></form>`;
  root.querySelector('[data-back]').onclick = () => renderPerson(root, person.id); root.querySelector('form').onsubmit = async (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); try { const start = buildAssessmentStart({ personId: person.id, professionalName: data.get('professionalName'), testIds: data.getAll('testIds') }); const assessment = { id: crypto.randomUUID(), personId: person.id, personName: person.name, personSex: person.sex, personBirthDate: person.birthDate, ...start, date: data.get('date'), status: 'rascunho', results: [] }; localStorage.setItem(`assessment:${assessment.id}`, JSON.stringify(assessment)); await queueMutation('createAssessment', assessmentForCreate(assessment)); renderAssessmentEditor(root, assessment, () => renderPerson(root, person.id)); } catch (error) { root.querySelector('.form-message').textContent = error.message; } };
}
