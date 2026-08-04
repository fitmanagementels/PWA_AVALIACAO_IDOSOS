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

export function bindSelectionSummary(form, { inputName, summarySelector, buttonSelector, idleLabel, selectedLabel = idleLabel }) {
  const update = () => {
    const inputs = [...form.querySelectorAll(`input[name="${inputName}"]`)];
    const count = inputs.filter((input) => input.checked).length;
    const copy = selectionSummary(count, count ? selectedLabel : idleLabel);
    form.querySelector(summarySelector).textContent = copy.count;
    form.querySelector(buttonSelector).textContent = copy.action;
    inputs.forEach((input) => input.closest('.selection-card')?.classList.toggle('is-selected', input.checked));
  };
  form.addEventListener('change', update);
  update();
}
