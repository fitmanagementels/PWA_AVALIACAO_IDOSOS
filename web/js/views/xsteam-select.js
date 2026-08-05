const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));

export function xsteamSelectMarkup({ id, name, label, options, value = '', placeholder = 'Selecione', required = false, dataAttribute = '' }) {
  const selected = options.find(([optionValue]) => optionValue === value);
  const selectedLabel = selected?.[1] || placeholder;
  const optionMarkup = options.map(([optionValue, optionLabel]) => `<button type="button" role="option" data-xsteam-option value="${escapeHtml(optionValue)}" aria-selected="${optionValue === value}">${escapeHtml(optionLabel)}</button>`).join('');
  return `<div class="xsteam-select" data-xsteam-select${required ? ' data-xsteam-required' : ''}><span class="xsteam-select__label" id="${escapeHtml(id)}-label">${escapeHtml(label)}</span><input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}"${dataAttribute ? ` ${dataAttribute}` : ''}><button type="button" class="xsteam-select__trigger" data-xsteam-trigger aria-labelledby="${escapeHtml(id)}-label ${escapeHtml(id)}-value" aria-haspopup="listbox" aria-expanded="false"><span id="${escapeHtml(id)}-value" data-xsteam-value>${escapeHtml(selectedLabel)}</span><span aria-hidden="true">⌄</span></button><div class="xsteam-select__layer" data-xsteam-layer hidden><button class="xsteam-select__backdrop" type="button" aria-label="Fechar menu" data-xsteam-dismiss></button><div class="xsteam-select__options" role="listbox" aria-labelledby="${escapeHtml(id)}-label">${optionMarkup}</div></div><p class="xsteam-select__error" data-xsteam-error aria-live="polite"></p></div>`;
}

const controls = (root) => [...root.querySelectorAll('[data-xsteam-select]')];
const optionsFor = (control) => [...control.querySelectorAll('[data-xsteam-option]')];
const selectedIndex = (control) => Math.max(0, optionsFor(control).findIndex((option) => option.getAttribute('aria-selected') === 'true'));

function close(control, restoreFocus = true) {
  const trigger = control.querySelector('[data-xsteam-trigger]');
  control.querySelector('[data-xsteam-layer]').hidden = true;
  trigger.setAttribute('aria-expanded', 'false');
  if (restoreFocus) trigger.focus();
}

function open(root, control, index = selectedIndex(control)) {
  controls(root).filter((item) => item !== control).forEach((item) => close(item, false));
  control.querySelector('[data-xsteam-layer]').hidden = false;
  control.querySelector('[data-xsteam-trigger]').setAttribute('aria-expanded', 'true');
  optionsFor(control)[index]?.focus();
}

function choose(control, option) {
  const input = control.querySelector('input[type="hidden"]');
  const triggerValue = control.querySelector('[data-xsteam-value]');
  optionsFor(control).forEach((item) => item.setAttribute('aria-selected', String(item === option)));
  input.value = option.value;
  triggerValue.textContent = option.textContent;
  control.querySelector('[data-xsteam-trigger]').removeAttribute('aria-invalid');
  control.querySelector('[data-xsteam-error]').textContent = '';
  input.dispatchEvent(new Event('change', { bubbles: true }));
  close(control);
}

export function bindXsteamSelects(root) {
  root.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-xsteam-trigger]');
    if (trigger) return open(root, trigger.closest('[data-xsteam-select]'));
    const option = event.target.closest('[data-xsteam-option]');
    if (option) return choose(option.closest('[data-xsteam-select]'), option);
    const dismiss = event.target.closest('[data-xsteam-dismiss]');
    if (dismiss) close(dismiss.closest('[data-xsteam-select]'));
  });
  root.addEventListener('keydown', (event) => {
    const trigger = event.target.closest('[data-xsteam-trigger]');
    if (trigger && ['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      const control = trigger.closest('[data-xsteam-select]');
      return open(root, control, event.key === 'ArrowUp' ? optionsFor(control).length - 1 : selectedIndex(control));
    }
    const option = event.target.closest('[data-xsteam-option]');
    if (!option) return;
    const control = option.closest('[data-xsteam-select]');
    const items = optionsFor(control);
    const index = items.indexOf(option);
    if (event.key === 'Escape') { event.preventDefault(); return close(control); }
    if (['Enter', ' '].includes(event.key)) { event.preventDefault(); return choose(control, option); }
    const next = event.key === 'ArrowDown' ? index + 1 : event.key === 'ArrowUp' ? index - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : index;
    if (next !== index) { event.preventDefault(); items[(next + items.length) % items.length]?.focus(); }
  });
}

export function validateXsteamSelects(form) {
  let valid = true;
  form.querySelectorAll('[data-xsteam-required]').forEach((control) => {
    const input = control.querySelector('input[type="hidden"]');
    const trigger = control.querySelector('[data-xsteam-trigger]');
    const error = control.querySelector('[data-xsteam-error]');
    const missing = !input.value;
    trigger.setAttribute('aria-invalid', String(missing));
    error.textContent = missing ? 'Selecione uma opção para continuar.' : '';
    valid &&= !missing;
  });
  return valid;
}
