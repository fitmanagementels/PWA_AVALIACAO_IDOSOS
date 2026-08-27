let credential = null;
let initialized = false;

export function getIdentityToken() {
  return Promise.resolve(credential);
}

export function clearIdentityToken() {
  credential = null;
}

export function promptGoogleSession() {
  globalThis.google?.accounts?.id?.prompt();
}

export function initializeGoogleSession({ clientId, onSignedIn = () => {}, onError = () => {} } = {}) {
  if (initialized) return;
  if (!clientId) {
    onError(new Error('Defina GOOGLE_CLIENT_ID antes de ativar o login Google.'));
    return;
  }
  const identity = globalThis.google?.accounts?.id;
  if (!identity) {
    onError(new Error('O login Google ainda não foi carregado.'));
    return;
  }
  identity.initialize({
    client_id: clientId,
    callback(response) {
      if (!response?.credential) return onError(new Error('Não foi possível iniciar a sessão Google.'));
      credential = response.credential;
      onSignedIn();
    },
  });
  initialized = true;
  promptGoogleSession();
}

if (typeof window !== 'undefined') window.getIdentityToken = getIdentityToken;
