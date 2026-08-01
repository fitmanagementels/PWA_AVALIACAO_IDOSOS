import { PROFESSIONALS, TESTS, buildAssessmentStart, whatsAppUrl } from '../domain.js';
import { renderAssessmentEditor } from './assessment-editor.js';
import { queueMutation } from '../storage.js';
import { assessmentForCreate, personForSave } from '../sync-model.js';
const key = 'avaliacao-idosos-people';
const read = () => JSON.parse(localStorage.getItem(key) || '[]');
const write = (items) => localStorage.setItem(key, JSON.stringify(items));
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
  root.querySelector('[data-back]').onclick = () => renderPeople(root); root.querySelector('[data-start]').onclick = () => renderStart(root, person); root.querySelector('[data-resume]').onclick = () => alert('Nenhum rascunho encontrado.'); root.querySelector('[data-history]').onclick = () => alert('O histórico aparecerá após avaliações salvas.');
}
function renderStart(root, person) {
  root.innerHTML = `<section class="screen-title"><div><p class="eyebrow">NOVA AVALIAÇÃO</p><h1>${person.name}</h1><p>Escolha os testes desta sessão.</p></div><button class="secondary" data-back>Voltar</button></section><form class="form-card"><label>Data<input name="date" type="date" value="${new Date().toISOString().slice(0, 10)}" required></label><label>Profissional<select name="professionalName" required><option value="">Selecione</option>${PROFESSIONALS.map((name) => `<option>${name}</option>`).join('')}</select></label><fieldset><legend>Testes</legend>${TESTS.map(([id, name]) => `<label class="check-option"><input type="checkbox" name="testIds" value="${id}"><span>${name}</span></label>`).join('')}</fieldset><button>Iniciar avaliação</button><p class="form-message"></p></form>`;
  root.querySelector('[data-back]').onclick = () => renderPerson(root, person.id); root.querySelector('form').onsubmit = async (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); try { const start = buildAssessmentStart({ personId: person.id, professionalName: data.get('professionalName'), testIds: data.getAll('testIds') }); const assessment = { id: crypto.randomUUID(), personId: person.id, personName: person.name, ...start, date: data.get('date'), status: 'rascunho', results: [] }; localStorage.setItem(`assessment:${assessment.id}`, JSON.stringify(assessment)); await queueMutation('createAssessment', assessmentForCreate(assessment)); renderAssessmentEditor(root, assessment, () => renderPerson(root, person.id)); } catch (error) { root.querySelector('.form-message').textContent = error.message; } };
}
