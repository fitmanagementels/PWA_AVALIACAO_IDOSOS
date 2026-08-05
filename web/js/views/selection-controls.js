const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));

export function selectionCardsMarkup({ name, items, selectedIds = [] }) {
  return items.map(([id, label]) => {
    const selected = selectedIds.includes(id);
    return `<label class="selection-card${selected ? ' is-selected' : ''}"><input class="selection-input" type="checkbox" name="${escapeHtml(name)}" value="${escapeHtml(id)}"${selected ? ' checked' : ''}><span class="selection-control" aria-hidden="true">✓</span><span>${escapeHtml(label)}</span></label>`;
  }).join('');
}

export function selectionSummary(count, action) {
  const noun = count === 1 ? 'teste' : 'testes';
  return {
    count: count ? `${count} ${noun} selecionado${count === 1 ? '' : 's'}` : 'Nenhum teste selecionado',
    action: count ? `${action} · ${count} ${noun}` : action
  };
}

export function selectionActionState(count, action) {
  const copy = selectionSummary(count, action);
  return {
    selectedCount: count,
    isReady: count > 0,
    label: count ? copy.action : 'Selecione ao menos um teste',
  };
}

export function bindSelectionSummary(form, { inputName, summarySelector, buttonSelector, idleLabel, selectedLabel = idleLabel, requireSelection = false }) {
  const update = () => {
    const inputs = [...form.querySelectorAll(`input[name="${inputName}"]`)];
    const count = inputs.filter((input) => input.checked).length;
    const copy = selectionSummary(count, count ? selectedLabel : idleLabel);
    const state = selectionActionState(count, selectedLabel);
    const button = form.querySelector(buttonSelector);
    form.querySelector(summarySelector).textContent = copy.count;
    button.textContent = state.isReady ? state.label : (requireSelection ? state.label : idleLabel);
    button.disabled = requireSelection && !state.isReady;
    button.dataset.selectionReady = String(state.isReady);
    inputs.forEach((input) => input.closest('.selection-card')?.classList.toggle('is-selected', input.checked));
  };
  form.addEventListener('change', update);
  update();
}
