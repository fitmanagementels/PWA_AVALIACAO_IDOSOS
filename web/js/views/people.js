import { PROFESSIONALS, TESTS, buildAssessmentStart, whatsAppUrl } from '../domain.js';
import { renderAssessmentEditor } from './assessment-editor.js';
import { groupHistoryByMonth, historyTimeline } from './history.js';
import { buildAttendanceItems } from './attendance-center.js';
import { defaultReportTestIds } from './report-selection.js';
import { formatDateBr } from '../date-format.js';
import { filterHistory, readHistoryCache, writeHistoryCache } from '../history-cache.js';
import { hasPendingAssessmentMutation, queueMutation } from '../storage.js';
import { assessmentForCreate, assessmentFromApi, historySummaryFromApi, personForSave, personFromApi, resultsFromApi } from '../sync-model.js';
import { request } from '../api-client.js';
import { bindSelectionSummary, selectionCardsMarkup } from './selection-controls.js';
import { bindXsteamSelects, validateXsteamSelects, xsteamSelectMarkup } from './xsteam-select.js';
import { isCurrentNavigation, startNavigation } from '../navigation-guard.js';
import { renderReportPreview } from './report-preview.js';
const key = 'avaliacao-idosos-people';
const testName = (id) => TESTS.find(([testId]) => testId === id)?.[1] || id;
const read = () => JSON.parse(localStorage.getItem(key) || '[]');
const write = (items) => localStorage.setItem(key, JSON.stringify(items));
export function replacePeopleFromApi(records) { write(records.map(personFromApi)); }
export function renderPeople(root) {
  startNavigation('people');
  const people = read();
  const assessments = localAssessmentRecords();
  const historiesByPerson = Object.fromEntries(people.map((person) => [person.id, readHistoryCache(localStorage, person.id)]));
  const attendance = buildAttendanceItems(people, assessments, historiesByPerson);
  root.innerHTML = `<section class="attendance-hero"><p class="eyebrow">CENTRAL DE ATENDIMENTOS</p><div class="attendance-hero__heading"><div><h1>Atendimentos</h1><p>Localize uma pessoa ou retome um registro deste aparelho.</p></div><button data-new>Nova pessoa</button></div><label class="search-field"><span>Buscar pessoa</span><input type="search" data-person-search placeholder="Digite um nome" autocomplete="off"></label></section><section class="attendance-directory" aria-label="Pessoas cadastradas"><div class="attendance-directory__header"><span>Pessoa</span><span>Próximo passo</span></div><div class="attendance-directory__list" data-person-list></div></section>`;
  const personList = root.querySelector('[data-person-list]');
  const renderList = (query = '') => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    const visible = attendance.filter(({ person }) => person.name.toLocaleLowerCase('pt-BR').includes(normalized));
    personList.innerHTML = visible.length ? visible.map((item) => attendanceRowMarkup(item)).join('') : '<article class="empty-state"><p>Nenhuma pessoa encontrada.</p></article>';
    personList.querySelectorAll('[data-id]').forEach((button) => button.onclick = () => renderPerson(root, button.dataset.id));
    personList.querySelectorAll('[data-resume-id]').forEach((button) => button.onclick = () => {
      const person = people.find((item) => item.id === button.dataset.resumeId);
      if (person) resumeLatestDraft(root, person);
    });
    personList.querySelectorAll('[data-remote-resume-id]').forEach((button) => button.onclick = () => {
      const person = people.find((item) => item.id === button.dataset.remoteResumeId);
      if (person) resumeRemoteDraft(root, person, button.dataset.assessmentId);
    });
    personList.querySelectorAll('[data-start-id]').forEach((button) => button.onclick = () => {
      const person = people.find((item) => item.id === button.dataset.startId);
      if (person) startAssessmentFlow(root, person);
    });
  };
  renderList();
  root.querySelector('[data-person-search]').oninput = (event) => renderList(event.target.value);
  root.querySelector('[data-new]').onclick = () => renderPersonForm(root);
}
function localAssessmentRecords() {
  return Object.keys(localStorage).filter((storageKey) => storageKey.startsWith('assessment:')).map((storageKey) => {
    try { return JSON.parse(localStorage.getItem(storageKey)); } catch (_) { return null; }
  }).filter(Boolean);
}
function readLocalAssessment(id) {
  try { return JSON.parse(localStorage.getItem(`assessment:${id}`) || 'null'); } catch (_) { return null; }
}
function attendanceRowMarkup({ person, kind, draft, history }) {
  const profile = `${formatDateBr(person.birthDate)} · ${person.sex}`;
  const completed = history?.status === 'concluida' ? `<span>Última concluída: ${formatDateBr(history.date)}</span>` : '';
  if (kind === 'draft') return `<article class="attendance-row"><button class="attendance-row__person" data-id="${person.id}"><strong>${person.name}</strong><span>${profile}</span></button><div class="attendance-row__action"><span class="state-chip neutral">Rascunho neste aparelho</span>${completed}<button class="secondary" data-resume-id="${person.id}">Retomar rascunho</button></div></article>`;
  if (kind === 'remote-draft') return `<article class="attendance-row"><button class="attendance-row__person" data-id="${person.id}"><strong>${person.name}</strong><span>${profile}</span></button><div class="attendance-row__action"><span class="state-chip neutral">Avaliação em andamento</span>${completed}<button class="secondary" data-remote-resume-id="${person.id}" data-assessment-id="${person.flow.rascunhoAtivo.avaliacaoId}">Retomar avaliação</button></div></article>`;
  if (kind === 'history') return `<article class="attendance-row"><button class="attendance-row__person" data-id="${person.id}"><strong>${person.name}</strong><span>${profile}</span></button><div class="attendance-row__action"><span>Última avaliação: ${formatDateBr(history.date)}</span><button class="secondary" data-id="${person.id}">Ver atendimento</button></div></article>`;
  return `<article class="attendance-row"><button class="attendance-row__person" data-id="${person.id}"><strong>${person.name}</strong><span>${profile}</span></button><div class="attendance-row__action"><span>Sem registro neste aparelho</span><button class="secondary" data-start-id="${person.id}">Nova avaliação</button></div></article>`;
}
function renderPersonForm(root) {
  const navigation = startNavigation('person-form');
  root.innerHTML = `<section class="screen-title"><div><p class="eyebrow">NOVO CADASTRO</p><h1>Pessoa avaliada</h1></div><button class="secondary" data-back>Voltar</button></section><form class="form-card"><label>Nome completo<input name="name" required></label><label>Data de nascimento<input name="birthDate" type="date" required></label>${xsteamSelectMarkup({ id: 'person-sex', name: 'sex', label: 'Sexo', options: [['', 'Selecione'], ['masculino', 'Masculino'], ['feminino', 'Feminino']], required: true })}<label>WhatsApp (opcional)<input name="whatsapp" inputmode="tel"></label><button>Salvar pessoa</button></form>`;
  bindXsteamSelects(root);
  root.querySelector('[data-back]').onclick = () => renderPeople(root);
  root.querySelector('form').onsubmit = async (event) => { event.preventDefault(); if (!validateXsteamSelects(event.currentTarget)) return; const data = new FormData(event.currentTarget); const person = { id: crypto.randomUUID(), name: data.get('name').trim(), birthDate: data.get('birthDate'), sex: data.get('sex'), whatsapp: String(data.get('whatsapp')).replace(/\D/g, '') }; write([...read(), person]); await queueMutation('savePerson', personForSave(person)); if (isCurrentNavigation(navigation)) renderPerson(root, person.id); };
}
function renderPerson(root, id) {
  startNavigation('person');
  const person = read().find((item) => item.id === id); if (!person) return renderPeople(root); const link = whatsAppUrl(person.whatsapp);
  root.innerHTML = `<section class="screen-title"><div><p class="eyebrow">PESSOA AVALIADA</p><h1>${person.name}</h1><p>${formatDateBr(person.birthDate)} · ${person.sex}</p></div><button class="secondary" data-back>Voltar</button></section><section class="action-grid"><button data-start>+ Nova avaliação</button><button class="secondary" data-resume>↺ Retomar rascunho</button><button class="secondary" data-history>↗ Histórico</button></section>${link ? `<a class="whatsapp-link" href="${link}" target="_blank" rel="noopener">Abrir conversa no WhatsApp</a>` : '<p class="muted">Sem WhatsApp cadastrado.</p>'}`;
  root.querySelector('[data-back]').onclick = () => renderPeople(root); root.querySelector('[data-start]').onclick = () => startAssessmentFlow(root, person); root.querySelector('[data-resume]').onclick = () => {
    const localDraft = localAssessmentsFor(person.id).find((assessment) => assessment.status === 'rascunho' || assessment.status === 'pendenteDeSincronizacao');
    if (localDraft) return resumeLatestDraft(root, person);
    if (person.flow?.rascunhoAtivo) return renderActiveDraftNotice(root, person, person.flow.rascunhoAtivo);
    alert('Nenhum rascunho em andamento para esta pessoa.');
  }; root.querySelector('[data-history]').onclick = () => renderHistory(root, person);
}

function localAssessmentsFor(personId) {
  return localAssessmentRecords().filter((assessment) => assessment.personId === personId);
}
function resumeLatestDraft(root, person) {
  const assessment = localAssessmentsFor(person.id).sort((a, b) => String(b.updatedAt || b.date).localeCompare(String(a.updatedAt || a.date)))[0];
  if (!assessment) return alert('Nenhum rascunho neste aparelho. Consulte o histórico para avaliações já sincronizadas.');
  startNavigation('assessment-editor');
  renderAssessmentEditor(root, assessment, () => renderPerson(root, person.id));
}
async function resumeRemoteDraft(root, person, assessmentId) {
  try {
    const response = await request('getAssessment', { avaliacaoId: assessmentId }, 'GET');
    const loaded = assessmentFromApi(response.data.assessment);
    const assessment = {
      ...loaded,
      personName: person.name,
      personSex: person.sex,
      personBirthDate: person.birthDate,
      results: resultsFromApi(response.data.results),
      testNotes: response.data.assessment.notasTestes || '',
      studentObservations: response.data.assessment.observacoesAluno || '',
      draftInputs: {
        testNotes: response.data.assessment.notasTestes || '',
        studentObservations: response.data.assessment.observacoesAluno || ''
      }
    };
    localStorage.setItem(`assessment:${assessment.id}`, JSON.stringify(assessment));
    startNavigation('assessment-editor');
    renderAssessmentEditor(root, assessment, () => renderPerson(root, person.id));
  } catch (error) {
    root.querySelector('[data-person-list]')?.insertAdjacentHTML('beforebegin', `<p class="form-message">Não foi possível retomar o rascunho: ${String(error.message || error)}</p>`);
  }
}
async function startAssessmentFlow(root, person) {
  const localDraft = localAssessmentsFor(person.id).find((assessment) => assessment.status === 'rascunho' || assessment.status === 'pendenteDeSincronizacao');
  if (localDraft) return resumeLatestDraft(root, person);
  try {
    const response = await request('getPersonFlow', { pessoaId: person.id }, 'GET');
    person.flow = response.data;
    write(read().map((item) => item.id === person.id ? person : item));
    if (person.flow.rascunhoAtivo) return renderActiveDraftNotice(root, person, person.flow.rascunhoAtivo);
  } catch (_) {
    // Em modo offline, o backend continuará protegendo contra duplicidade quando a fila for enviada.
  }
  renderStart(root, person);
}
function renderActiveDraftNotice(root, person, activeDraft) {
  const navigation = startNavigation('active-draft');
  root.innerHTML = `<section class="screen-title"><div><p class="eyebrow">AVALIAÇÃO EM ANDAMENTO</p><h1>${person.name}</h1><p>Existe um rascunho de ${formatDateBr(activeDraft.data)}${activeDraft.profissionalNome ? ` · ${activeDraft.profissionalNome}` : ''}.</p></div><button class="secondary" data-back>Voltar</button></section><section class="form-card"><h2>Retome ou arquive antes de criar outra avaliação</h2><p class="muted">Isso evita avaliações duplicadas e mantém a finalização segura.</p><section class="action-grid"><button data-resume-active>Retomar avaliação em andamento</button><button class="secondary" data-archive-active>Arquivar rascunho</button></section><p class="form-message" aria-live="polite"></p></section>`;
  const message = root.querySelector('.form-message');
  const archive = root.querySelector('[data-archive-active]');
  let awaitingArchiveConfirmation = false;
  root.querySelector('[data-back]').onclick = () => renderPerson(root, person.id);
  root.querySelector('[data-resume-active]').onclick = () => resumeRemoteDraft(root, person, activeDraft.avaliacaoId);
  archive.onclick = async () => {
    if (!awaitingArchiveConfirmation) {
      awaitingArchiveConfirmation = true;
      archive.textContent = 'Confirmar arquivamento';
      message.textContent = 'O rascunho continuará registrado, mas deixará de aparecer como avaliação em andamento.';
      return;
    }
    archive.disabled = true;
    try {
      const response = await request('archiveAssessment', { avaliacaoId: activeDraft.avaliacaoId });
      if (!response.ok) throw response.error || new Error('Não foi possível arquivar o rascunho');
      if (!isCurrentNavigation(navigation)) return;
      person.flow = { ...person.flow, rascunhoAtivo: null };
      write(read().map((item) => item.id === person.id ? person : item));
      renderStart(root, person);
    } catch (error) {
      archive.disabled = false;
      message.textContent = error.message || 'Não foi possível arquivar o rascunho.';
    }
  };
}
async function renderHistory(root, person) {
  const navigation = startNavigation('history');
  const cached = readHistoryCache(localStorage, person.id);
  if (cached.length) renderHistoryList(root, person, cached, 'Histórico deste aparelho · atualizando dados compartilhados…', '', navigation);
  else {
    root.innerHTML = `<section class="screen-title"><div><p class="eyebrow">HISTÓRICO COMPARTILHADO</p><h1>${person.name}</h1><p>Carregando avaliações salvas na planilha…</p></div><button class="secondary" data-back>Voltar</button></section>`;
    root.querySelector('[data-back]').onclick = () => renderPerson(root, person.id);
  }
  try {
    const response = await request('getHistorySummary', { pessoaId: person.id }, 'GET');
    const records = response.data.map(historySummaryFromApi);
    const assessments = historyTimeline(records, person);
    writeHistoryCache(localStorage, person.id, assessments);
    if (!isCurrentNavigation(navigation)) return;
    renderHistoryList(root, person, assessments, assessments.length ? 'Selecione uma avaliação para ver os resultados.' : 'Ainda não há avaliações sincronizadas.', '', navigation);
  } catch (error) {
    if (!isCurrentNavigation(navigation)) return;
    root.querySelector('.screen-title p:not(.eyebrow)').textContent = cached.length ? 'Mostrando histórico salvo neste aparelho. A atualização compartilhada está indisponível.' : `Não foi possível carregar o histórico: ${error.message}`;
  }
}
function renderHistoryList(root, person, assessments, subtitle, testId = '', navigation = startNavigation('history')) {
  root.innerHTML = `<section class="screen-title"><div><p class="eyebrow">HISTÓRICO COMPARTILHADO</p><h1>${person.name}</h1><p>${subtitle}</p></div><button class="secondary" data-back>Voltar</button></section>${xsteamSelectMarkup({ id: 'history-test', name: 'historyTest', label: 'Filtrar por teste', options: [['', 'Todos os testes'], ...TESTS], value: testId, dataAttribute: 'data-history-test' })}<p class="form-message" data-history-message></p><section class="history-timeline" data-history-list></section>`;
  bindXsteamSelects(root);
  const list = root.querySelector('[data-history-list]');
  let selectedTestId = testId;
  const returnToHistory = (message = '') => {
    renderHistoryList(root, person, assessments, subtitle, selectedTestId);
    root.querySelector('[data-history-message]').textContent = message;
  };
  const renderList = () => {
    const visible = filterHistory(assessments, { testId: selectedTestId });
    const groups = groupHistoryByMonth(visible);
    list.innerHTML = groups.length ? groups.map((group) => `<section class="history-month"><h2>${historyMonthLabel(group.key)}</h2>${group.items.map((assessment) => `<button class="history-entry" data-assessment-id="${assessment.assessmentId}"><strong>${formatDateBr(assessment.date)}</strong><span>${assessment.professionalName} · ${assessment.status} · ${assessment.testIds.length} teste${assessment.testIds.length === 1 ? '' : 's'}</span><span class="history-entry__tests">${assessment.testIds.map(testName).join(' · ')}</span></button>`).join('')}</section>`).join('') : '<article class="empty-state"><p>Nenhuma avaliação para este filtro.</p></article>';
    list.querySelectorAll('[data-assessment-id]').forEach((button) => button.onclick = () => {
      button.disabled = true;
      button.classList.add('is-loading');
      button.setAttribute('aria-busy', 'true');
      renderAssessmentHistory(root, person, button.dataset.assessmentId, returnToHistory);
    });
  };
  root.querySelector('[data-back]').onclick = () => renderPerson(root, person.id);
  root.querySelector('[data-history-test]').onchange = (event) => { selectedTestId = event.target.value; startNavigation('history'); renderList(); };
  renderList();
}
function historyMonthLabel(key) {
  if (key === 'sem-data') return 'Sem data';
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${key}-01T12:00:00Z`));
  return label.charAt(0).toLocaleUpperCase('pt-BR') + label.slice(1);
}
async function renderAssessmentHistory(root, person, assessmentId, onBack = () => renderHistory(root, person), navigation = startNavigation('assessment-history')) {
  try {
    const response = await request('getAssessment', { avaliacaoId: assessmentId }, 'GET');
    const assessment = {
      ...assessmentFromApi(response.data.assessment),
      updatedAt: response.data.assessment.ultimaAtualizacao || '',
      studentObservations: response.data.assessment.observacoesAluno || ''
    };
    const results = response.data.results;
    if (!isCurrentNavigation(navigation)) return;
    root.innerHTML = `<section class="screen-title"><div><p class="eyebrow">AVALIAÇÃO SALVA</p><h1>${formatDateBr(assessment.date)}</h1><p>${assessment.professionalName} · ${assessment.status}</p></div><button class="secondary" data-back>Voltar</button></section><section class="list">${results.length ? results.map((result) => `<article class="empty-state"><strong>${testName(result.testeId)}${result.lado ? ` · ${result.lado}` : ''}</strong><p>${result.status === 'naoConcluido' ? `Não concluído: ${result.motivoNaoConcluido}` : `${result.valorOficial} ${result.unidade}${result.classificacao ? ` · ${result.classificacao}` : ''}`}</p></article>`).join('') : '<article class="empty-state"><p>Sem resultados registrados.</p></article>'}</section><section class="action-grid"><button class="secondary" data-edit>Editar e complementar</button><button data-report>Exportar relatório PDF</button></section><p class="form-message"></p>`;
    root.querySelector('[data-back]').onclick = () => onBack();
    root.querySelector('[data-edit]').onclick = () => {
      const editable = { ...assessment, personName: person.name, personSex: person.sex, personBirthDate: person.birthDate, results: resultsFromApi(results) };
      localStorage.setItem(`assessment:${editable.id}`, JSON.stringify(editable));
      startNavigation('assessment-editor');
      renderAssessmentEditor(root, editable, () => renderAssessmentHistory(root, person, assessment.id, onBack));
    };
    root.querySelector('[data-report]').onclick = async () => {
      const pending = await hasPendingAssessmentMutation(assessment.id);
      if (!isCurrentNavigation(navigation)) return;
      const local = readLocalAssessment(assessment.id);
      const reportAssessment = pending && local ? { ...assessment, ...local } : assessment;
      const reportResults = pending && local?.results?.length ? local.results : results;
      const selected = defaultReportTestIds(reportResults);
      if (!selected.length) {
        root.querySelector('.form-message').textContent = 'Não há testes concluídos para incluir no relatório.';
        return;
      }
      const selectedItems = selected.map((id) => [id, testName(id)]);
      const target = root.querySelector('.action-grid');
      target.innerHTML = `<form class="form-card report-selection"><strong>Testes no relatório</strong><p class="selection-summary" data-selection-summary="report"></p><div class="selection-list">${selectionCardsMarkup({ name: 'includedTestIds', items: selectedItems, selectedIds: selected })}</div><section class="action-grid"><button data-selection-action="report">Ver prévia do relatório</button><button class="secondary" type="button" data-report-cancel>Cancelar</button></section></form>`;
      const reportForm = target.querySelector('form');
      bindSelectionSummary(reportForm, { inputName: 'includedTestIds', summarySelector: '[data-selection-summary="report"]', buttonSelector: '[data-selection-action="report"]', idleLabel: 'Ver prévia do relatório' });
      target.querySelector('[data-report-cancel]').onclick = () => renderAssessmentHistory(root, person, assessment.id, onBack);
      reportForm.onsubmit = (event) => {
        event.preventDefault();
        const includedTestIds = new FormData(event.currentTarget).getAll('includedTestIds');
        if (!includedTestIds.length) return;
        startNavigation('report-preview');
        renderReportPreview(root, {
          person,
          assessment: reportAssessment,
          results: reportResults,
          includedTestIds,
          isPendingSync: pending,
          onBack: () => renderAssessmentHistory(root, person, assessment.id, onBack)
        });
      };
    };
  } catch (error) {
    if (isCurrentNavigation(navigation)) onBack(`Não foi possível carregar esta avaliação: ${error.message}`);
  }
}
function renderStart(root, person) {
  const navigation = startNavigation('assessment-start');
  root.innerHTML = `<section class="screen-title"><div><p class="eyebrow">NOVA AVALIAÇÃO</p><h1>${person.name}</h1><p>Configure a sessão e escolha os testes.</p></div><button class="secondary" data-back>Voltar</button></section><form class="form-card assessment-start"><section class="session-fields"><label>Data<input name="date" type="date" value="${new Date().toISOString().slice(0, 10)}" required></label>${xsteamSelectMarkup({ id: 'assessment-professional', name: 'professionalName', label: 'Profissional', options: [['', 'Selecione'], ...PROFESSIONALS.map((name) => [name, name])], required: true })}</section><fieldset class="selection-group"><legend>Testes da sessão</legend><p class="selection-summary" data-selection-summary="start"></p><div class="selection-list">${selectionCardsMarkup({ name: 'testIds', items: TESTS })}</div></fieldset><button class="assessment-submit" data-selection-action="start" data-selection-ready="false" disabled>Selecione ao menos um teste</button><p class="form-message"></p></form>`;
  bindXsteamSelects(root);
  root.querySelector('[data-back]').onclick = () => renderPerson(root, person.id);
  const form = root.querySelector('form');
  bindSelectionSummary(form, { inputName: 'testIds', summarySelector: '[data-selection-summary="start"]', buttonSelector: '[data-selection-action="start"]', idleLabel: 'Iniciar avaliação', requireSelection: true });
  form.onsubmit = async (event) => { event.preventDefault(); if (!validateXsteamSelects(event.currentTarget)) return; const data = new FormData(event.currentTarget); try { const start = buildAssessmentStart({ personId: person.id, professionalName: data.get('professionalName'), testIds: data.getAll('testIds') }); const assessment = { id: crypto.randomUUID(), personId: person.id, personName: person.name, personSex: person.sex, personBirthDate: person.birthDate, ...start, date: data.get('date'), status: 'rascunho', results: [] }; localStorage.setItem(`assessment:${assessment.id}`, JSON.stringify(assessment)); await queueMutation('createAssessment', assessmentForCreate(assessment)); if (!isCurrentNavigation(navigation)) return; startNavigation('assessment-editor'); renderAssessmentEditor(root, assessment, () => renderPerson(root, person.id)); } catch (error) { if (isCurrentNavigation(navigation)) root.querySelector('.form-message').textContent = error.message; } };
}
