const SPPB_FIELDS = [
  ['Caminhada 4 m — tentativa 1', 'sppb-gait-1'],
  ['Caminhada 4 m — tentativa 2', 'sppb-gait-2'],
  ['Sentar e levantar 5x', 'sppb-chair'],
  ['Equilíbrio: pés juntos', 'sppb-feet'],
  ['Equilíbrio: semi-tandem', 'sppb-semi'],
  ['Equilíbrio: tandem', 'sppb-tandem'],
];

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
const valueAttribute = (inputs, name) => ` value="${escapeHtml(inputs[name] ?? '')}"`;
const checkedAttribute = (inputs, name) => inputs[name] === 'on' ? ' checked' : '';

export function testSheetMarkup({ testId, definition, fields, summary }) {
  const safeId = escapeHtml(testId);
  const title = escapeHtml(definition.title);
  return `<div class="test-sheet-layer" data-test-sheet-layer>
    <button class="test-sheet-scrim" type="button" data-test-sheet-close aria-label="Fechar ${title}"></button>
    <section class="test-sheet" role="dialog" aria-modal="true" aria-labelledby="test-sheet-title-${safeId}" tabindex="-1">
      <header class="test-sheet__header"><div><p class="eyebrow">REGISTRO DO TESTE</p><h2 id="test-sheet-title-${safeId}">${title}</h2></div><button class="secondary test-sheet__close" type="button" data-test-sheet-close aria-label="Fechar">×</button></header>
      <div class="test-sheet__intro"><figure class="test-sheet__visual"><span aria-hidden="true">▧</span><figcaption>Imagem de referência<br><small>Inserir referência do teste</small></figcaption></figure><div class="test-sheet__procedure"><h3>Como executar</h3><p>${escapeHtml(definition.hint)}</p><span class="state-chip neutral">Unidade: ${escapeHtml(definition.unit)}</span></div></div>
      <form class="test-sheet__form" data-test-sheet-form data-not-completed="false">${fields}<p class="result-caption" data-test-sheet-summary>${escapeHtml(summary.text)}</p><p class="form-message" data-test-sheet-message aria-live="polite"></p><button type="submit" data-test-sheet-save>Salvar e voltar</button></form>
    </section>
  </div>`;
}

export function testFieldsMarkup({ testId, definition, draftInputs = {} }) {
  const toggle = notCompletedToggle(`${testId}-not-completed`, draftInputs);
  const reason = `<label class="test-sheet__reason">Motivo, se não concluído<input name="${escapeHtml(testId)}-reason" placeholder="Dor, insegurança, intercorrência ou recusa"${valueAttribute(draftInputs, `${testId}-reason`)}></label>`;
  if (testId === 'sppb') return `${toggle}${reason}<div class="test-field-section"><h3>Caminhada</h3><div class="test-attempt-group">${compactNumberField(SPPB_FIELDS[0], 's', draftInputs)}${compactNumberField(SPPB_FIELDS[1], 's', draftInputs)}</div></div><div class="test-field-section"><h3>Sentar e levantar</h3>${compactNumberField(SPPB_FIELDS[2], 's', draftInputs)}</div><div class="test-field-section"><h3>Equilíbrio</h3><div class="test-attempt-group">${compactNumberField(SPPB_FIELDS[3], 's', draftInputs)}${compactNumberField(SPPB_FIELDS[4], 's', draftInputs)}${compactNumberField(SPPB_FIELDS[5], 's', draftInputs)}</div></div>`;
  return `${toggle}${reason}${definition.sides.map((side) => `<div class="test-field-section"><h3>${side === 'unico' ? 'Resultado' : capitalize(side)}</h3><div class="test-attempt-group">${Array.from({ length: definition.attempts }, (_, index) => compactNumberField([`Tentativa ${index + 1}`, `${testId}-${side}-${index + 1}`], definition.unit, draftInputs)).join('')}</div></div>`).join('')}`;
}

export function openTestSheet({ origin, testId, definition, draftInputs, summary, persist, onClose }) {
  const fields = testFieldsMarkup({ testId, definition, draftInputs });
  document.body.insertAdjacentHTML('beforeend', testSheetMarkup({ testId, definition, fields, summary }));
  const layer = document.body.querySelector('[data-test-sheet-layer]:last-child');
  const sheet = layer.querySelector('.test-sheet');
  const form = layer.querySelector('[data-test-sheet-form]');
  const message = layer.querySelector('[data-test-sheet-message]');
  let pendingSave = Promise.resolve();
  let closing = false;

  const syncNotCompletedState = () => form.dataset.notCompleted = form.elements[`${testId}-not-completed`].checked ? 'true' : 'false';
  const save = () => {
    const values = Object.fromEntries(new FormData(form));
    const currentSave = pendingSave.catch(() => undefined).then(() => persist(values));
    pendingSave = currentSave;
    return currentSave;
  };
  const reportSaveFailure = (error) => { message.textContent = error?.message || 'Não foi possível salvar neste aparelho. Tente novamente.'; };
  const close = async () => {
    if (closing) return;
    closing = true;
    message.textContent = 'Salvando neste aparelho…';
    try {
      await save();
      layer.remove();
      document.removeEventListener('keydown', trapFocus);
      onClose();
      origin.focus();
    } catch (error) {
      closing = false;
      reportSaveFailure(error);
    }
  };
  const trapFocus = (event) => {
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.key !== 'Tab') return;
    const controls = [...sheet.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')];
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  form.addEventListener('input', () => { save().then(() => { message.textContent = 'Alterações salvas neste aparelho.'; }).catch(reportSaveFailure); });
  form.addEventListener('change', () => { syncNotCompletedState(); save().then(() => { message.textContent = 'Alterações salvas neste aparelho.'; }).catch(reportSaveFailure); });
  form.addEventListener('submit', (event) => { event.preventDefault(); close(); });
  layer.querySelectorAll('[data-test-sheet-close]').forEach((button) => button.addEventListener('click', close));
  document.addEventListener('keydown', trapFocus);
  syncNotCompletedState();
  sheet.focus();
}

function notCompletedToggle(name, inputs) {
  return `<label class="selection-toggle"><input type="checkbox" name="${escapeHtml(name)}"${checkedAttribute(inputs, name)}><span class="toggle-track" aria-hidden="true"><span></span></span><span>Não concluído</span></label>`;
}

function compactNumberField([label, name], unit, inputs) {
  return `<label class="compact-number-field"><span>${escapeHtml(label)}</span><span class="compact-number-field__control"><input name="${escapeHtml(name)}" inputmode="decimal"${valueAttribute(inputs, name)}><small>${escapeHtml(unit)}</small></span></label>`;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
