function errorMessage(error) {
  return error?.message || error?.error?.message || 'Não foi possível sincronizar agora.';
}

async function status(queue, phase, message) {
  const items = await queue.list();
  return { ok: phase !== 'error', phase, pendingCount: items.length, message, items };
}

export async function flushQueue(queue, send) {
  for (const mutation of await queue.list()) {
    try {
      await queue.clearFailure(mutation.id);
      const response = await send(mutation);
      if (!response?.ok) throw response?.error || new Error('Não foi possível sincronizar agora.');
      await queue.remove(mutation.id);
    } catch (error) {
      const message = errorMessage(error);
      await queue.markFailed(mutation.id, message);
      return status(queue, 'error', message);
    }
  }
  return status(queue, 'synced', 'Tudo sincronizado');
}

export async function pendingStatus(queue, phase = 'pending', message = 'Alterações aguardando sincronização') {
  return status(queue, phase, message);
}
