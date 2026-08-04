const actionLabel = (action) => ({ savePerson: 'Cadastro de pessoa', createAssessment: 'Início de avaliação', saveAssessment: 'Rascunho de avaliação', completeAssessment: 'Conclusão de avaliação' }[action] || 'Alteração pendente');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

export function syncPanelMarkup({ phase = 'synced', pendingCount = 0, message = 'Tudo sincronizado', items = [] }) {
  const retryable = phase === 'error' || phase === 'pending' || phase === 'offline';
  const stateLabel = { synced: 'Sincronizado', sending: 'Enviando', pending: 'Pendente', error: 'Atenção necessária', offline: 'Offline' }[phase] || 'Sincronização';
  return `<div class="sync-summary" role="status"><span class="sync-indicator" data-phase="${phase}" aria-hidden="true"></span><div><strong>${stateLabel}</strong><p>${escapeHtml(message)}</p></div>${retryable ? '<button class="sync-retry" type="button" data-retry>Tentar novamente</button>' : ''}</div>${pendingCount ? `<details class="sync-details"><summary>${pendingCount} ${pendingCount === 1 ? 'alteração pendente' : 'alterações pendentes'}</summary><ul>${items.map((item) => `<li><strong>${actionLabel(item.action)}</strong><span>${escapeHtml(item.lastError || 'Aguardando conexão')}</span></li>`).join('')}</ul></details>` : ''}`;
}

export function renderSyncPanel(root, state, { onRetry } = {}) {
  root.innerHTML = syncPanelMarkup(state);
  root.querySelector('[data-retry]')?.addEventListener('click', onRetry);
}
