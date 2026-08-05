let sequence = 0;
let current = { id: 0, page: 'initial' };

export function startNavigation(page) {
  current = { id: ++sequence, page };
  return current;
}

export function isCurrentNavigation(token) {
  return token?.id === current.id && token?.page === current.page;
}

export function isCurrentPage(page) {
  return current.page === page;
}
