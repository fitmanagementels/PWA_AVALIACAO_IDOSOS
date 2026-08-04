import { PROFESSIONALS, TESTS, buildAssessmentStart, whatsAppUrl } from '../domain.js';
import { renderAssessmentEditor } from './assessment-editor.js';
import { historyTimeline } from './history.js';
import { defaultReportTestIds } from './report-selection.js';
import { formatDateBr } from '../date-format.js';
import { filterHistory, readHistoryCache, writeHistoryCache } from '../history-cache.js';
import { queueMutation } from '../storage.js';
import { assessmentForCreate, assessmentFromApi, personForSave, personFromApi, resultsFromApi } from '../sync-model.js';
import { request } from '../api-client.js';
import { bindSelectionSummary, selectionCardsMarkup } from './selection-controls.js';
const key = 'avaliacao-idosos-people';
const testName = (id) => TESTS.find(([testId]) => testId === id)?.[1] || id;
const read = () => JSON.parse(localStorage.getItem(key) || '[]');
const write = (items) => localStorage.setItem(key, JSON.stringify(items));
export function replacePeopleFromApi(records) { write(records.map(personFromApi)); }
export function renderPeople(root) {
  const people = read();
  root.innerHTML = `<section class="screen-title"><div><p class="eyebrow">AVALIAÇÃO FUNCIONAL</p><h1>Pessoas</h1><p>Encontre um aluno ou crie um cadastro.</p></div><button data-new>Nova pessoa</button></section><label class="search-field">Buscar aluno<input type="search" data-person-search placeholder="Digite um nome"></label><section class="list" data-person-list></section>`;
  const personList = root.querySelector('[data-person-list]');
  const renderList = (query = '') => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    const visible = people.filter((person) => person.name.toLocaleLowerCase('pt-BR').includes(normalized));
    personList.innerHTML = visible.length ? visible.map((p) => `<button class="person-card" data-id="${p.id}"><strong>${p.name}</strong><span>${formatDateBr(p.birthDate)} · ${p.sex}</span></button>`).join('') : '<article class="empty-state"><p>Nenhum aluno encontrado.</p></article>';
    personList.querySelectorAll('[data-id]').forEach((button) => button.onclick = () => renderPerson(root, button.dataset.id));
  };
  renderList();
  root.querySelector('[data-person-search]').oninput = (event) => renderList(event.target.value);
  root.querySelector('[data-new]').onclick = () => renderPersonForm(root);
}
function renderPersonForm(root) {
  root.innerHTML = `<section class="screen-title"><div><p class="eyebrow">NOVO CADASTRO</p><h1>Pessoa avaliada</h1></div><button class="secondary" data-back>Voltar</button></section><form class="form-card"><label>Nome completo<input name="name" required></label><label>Data de nascimento<input name="birthDate" type="date" required></label><label>Sexo<select name="sex" required><option value="">Selecione</option><option value="masculino">Masculino</option><option value="feminino">Feminino</option></select></label><label>WhatsApp (opcional)<input name="whatsapp" inputmode="tel"></label><button>Salvar pessoa</button></form>`;
  root.querySelector('[data-back]').onclick = () => renderPeople(root);
  root.querySelector('form').onsubmit = async (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const person = { id: crypto.randomUUID(), name: data.get('name').trim(), birthDate: data.get('birthDate'), sex: data.get('sex'), whatsapp: String(data.get('whatsapp')).replace(/\D/g, '') }; write([...read(), person]); await queueMutation('savePerson', personForSave(person)); renderPerson(root, person.id); };
}
function renderPerson(root, id) {
  const person = read().find((item) => item.id === id); if (!person) return renderPeople(root); const link = whatsAppUrl(person.whatsapp);
  root.innerHTML = `<section class="screen-title"><div><p class="eyebrow">PESSOA AVALIADA</p><h1>${person.name}</h1><p>${formatDateBr(person.birthDate)} · ${person.sex}</p></div><button class="secondary" data-back>Voltar</button></section><section class="action-grid"><button data-start>+ Nova avaliação</button><button class="secondary" data-resume>↺ Retomar rascunho</button><button class="secondary" data-history>↗ Histórico</button></section>${link ? `<a class="whatsapp-link" href="${link}" target="_blank" rel="noopener">Abrir conversa no WhatsApp</a>` : '<p class="muted">Sem WhatsApp cadastrado.</p>'}`;
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
  const cached = readHistoryCache(localStorage, person.id);
  if (cached.length) renderHistoryList(root, person, cached, 'Histórico deste aparelho · atualizando dados compartilhados…');
  else {
    root.innerHTML = `<section class="screen-title"><div><p class="eyebrow">HISTÓRICO COMPARTILHADO</p><h1>${person.name}</h1><p>Carregando avaliações salvas na planilha…</p></div><button class="secondary" data-back>Voltar</button></section>`;
    root.querySelector('[data-back]').onclick = () => renderPerson(root, person.id);
  }
  try {
    const response = await request('getHistory', { pessoaId: person.id }, 'GET');
    const records = response.data.map((item) => ({ assessment: assessmentFromApi(item.assessment), results: resultsFromApi(item.results) }));
    const assessments = historyTimeline(records, person);
    writeHistoryCache(localStorage, person.id, assessments);
    renderHistoryList(root, person, assessments, assessments.length ? 'Selecione uma avaliação para ver os resultados.' : 'Ainda não há avaliações sincronizadas.');
  } catch (error) {
    root.querySelector('.screen-title p:not(.eyebrow)').textContent = cached.length ? 'Mostrando histórico salvo neste aparelho. A atualização compartilhada está indisponível.' : `Não foi possível carregar o histórico: ${error.message}`;
  }
}
function renderHistoryList(root, person, assessments, subtitle) {
  root.innerHTML = `<section class="screen-title"><div><p class="eyebrow">HISTÓRICO COMPARTILHADO</p><h1>${person.name}</h1><p>${subtitle}</p></div><button class="secondary" data-back>Voltar</button></section><label class="search-field">Filtrar por teste<select data-history-test><option value="">Todos os testes</option>${TESTS.map(([id, name]) => `<option value="${id}">${name}</option>`).join('')}</select></label><section class="list" data-history-list></section>`;
  const list = root.querySelector('[data-history-list]');
  const renderList = (testId = '') => {
    const visible = filterHistory(assessments, { testId });
    list.innerHTML = visible.length ? visible.map((assessment) => `<button class="person-card" data-assessment-id="${assessment.assessmentId}"><strong>${formatDateBr(assessment.date)}</strong><span>${assessment.professionalName} · ${assessment.status} · ${assessment.colors.green} verdes · ${assessment.colors.yellow} amarelos · ${assessment.colors.gray} cinzas</span></button>`).join('') : '<article class="empty-state"><p>Nenhuma avaliação para este filtro.</p></article>';
    list.querySelectorAll('[data-assessment-id]').forEach((button) => button.onclick = () => renderAssessmentHistory(root, person, button.dataset.assessmentId));
  };
  root.querySelector('[data-back]').onclick = () => renderPerson(root, person.id);
  root.querySelector('[data-history-test]').onchange = (event) => renderList(event.target.value);
  renderList();
}
async function renderAssessmentHistory(root, person, assessmentId) {
  root.innerHTML = `<section class="screen-title"><div><p class="eyebrow">AVALIAÇÃO SALVA</p><h1>${person.name}</h1><p>Carregando resultados…</p></div><button class="secondary" data-back>Voltar</button></section>`;
  root.querySelector('[data-back]').onclick = () => renderHistory(root, person);
  try {
    const response = await request('getAssessment', { avaliacaoId: assessmentId }, 'GET');
    const assessment = assessmentFromApi(response.data.assessment);
    const results = response.data.results;
    root.innerHTML = `<section class="screen-title"><div><p class="eyebrow">AVALIAÇÃO SALVA</p><h1>${formatDateBr(assessment.date)}</h1><p>${assessment.professionalName} · ${assessment.status}</p></div><button class="secondary" data-back>Voltar</button></section><section class="list">${results.length ? results.map((result) => `<article class="empty-state"><strong>${testName(result.testeId)}${result.lado ? ` · ${result.lado}` : ''}</strong><p>${result.status === 'naoConcluido' ? `Não concluído: ${result.motivoNaoConcluido}` : `${result.valorOficial} ${result.unidade}${result.classificacao ? ` · ${result.classificacao}` : ''}`}</p></article>`).join('') : '<article class="empty-state"><p>Sem resultados registrados.</p></article>'}</section><section class="action-grid"><button class="secondary" data-edit>Editar e complementar</button><button data-report>Exportar relatório PDF</button></section><p class="form-message"></p>`;
    root.querySelector('[data-back]').onclick = () => renderHistory(root, person);
    root.querySelector('[data-edit]').onclick = () => {
      const editable = { ...assessment, personName: person.name, personSex: person.sex, personBirthDate: person.birthDate, results: resultsFromApi(results) };
      localStorage.setItem(`assessment:${editable.id}`, JSON.stringify(editable));
      renderAssessmentEditor(root, editable, () => renderAssessmentHistory(root, person, assessment.id));
    };
    root.querySelector('[data-report]').onclick = () => {
      const selected = defaultReportTestIds(results);
      const target = root.querySelector('.action-grid');
      target.innerHTML = `<form class="form-card report-selection"><strong>Testes no relatório</strong><p class="selection-summary" data-selection-summary="report"></p><div class="selection-list">${selectionCardsMarkup({ name: 'includedTestIds', items: assessment.testIds.map((id) => [id, testName(id)]), selectedIds: selected })}</div><button data-selection-action="report">Gerar relatório PDF</button></form>`;
      const reportForm = target.querySelector('form');
      bindSelectionSummary(reportForm, { inputName: 'includedTestIds', summarySelector: '[data-selection-summary="report"]', buttonSelector: '[data-selection-action="report"]', idleLabel: 'Gerar relatório PDF' });
      reportForm.onsubmit = async (event) => {
        event.preventDefault(); const message = root.querySelector('.form-message'); message.textContent = 'Gerando relatório…';
        try { const report = await request('generateReport', { avaliacaoId: assessment.id, includedTestIds: new FormData(event.currentTarget).getAll('includedTestIds') }); message.textContent = 'Relatório gerado. Abrindo arquivo…'; window.open(report.data.url, '_blank', 'noopener'); } catch (error) { message.textContent = error.message; }
      };
    };
  } catch (error) {
    root.querySelector('.screen-title p:not(.eyebrow)').textContent = `Não foi possível carregar esta avaliação: ${error.message}`;
  }
}
function renderStart(root, person) {
  root.innerHTML = `<section class="screen-title"><div><p class="eyebrow">NOVA AVALIAÇÃO</p><h1>${person.name}</h1><p>Escolha os testes desta sessão.</p></div><button class="secondary" data-back>Voltar</button></section><form class="form-card"><label>Data<input name="date" type="date" value="${new Date().toISOString().slice(0, 10)}" required></label><label>Profissional<select name="professionalName" required><option value="">Selecione</option>${PROFESSIONALS.map((name) => `<option>${name}</option>`).join('')}</select></label><fieldset class="selection-group"><legend>Testes</legend><p class="selection-summary" data-selection-summary="start"></p><div class="selection-list">${selectionCardsMarkup({ name: 'testIds', items: TESTS })}</div></fieldset><button data-selection-action="start">Iniciar avaliação</button><p class="form-message"></p></form>`;
  root.querySelector('[data-back]').onclick = () => renderPerson(root, person.id);
  const form = root.querySelector('form');
  bindSelectionSummary(form, { inputName: 'testIds', summarySelector: '[data-selection-summary="start"]', buttonSelector: '[data-selection-action="start"]', idleLabel: 'Iniciar avaliação' });
  form.onsubmit = async (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); try { const start = buildAssessmentStart({ personId: person.id, professionalName: data.get('professionalName'), testIds: data.getAll('testIds') }); const assessment = { id: crypto.randomUUID(), personId: person.id, personName: person.name, personSex: person.sex, personBirthDate: person.birthDate, ...start, date: data.get('date'), status: 'rascunho', results: [] }; localStorage.setItem(`assessment:${assessment.id}`, JSON.stringify(assessment)); await queueMutation('createAssessment', assessmentForCreate(assessment)); renderAssessmentEditor(root, assessment, () => renderPerson(root, person.id)); } catch (error) { root.querySelector('.form-message').textContent = error.message; } };
}
