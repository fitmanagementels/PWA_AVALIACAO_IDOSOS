export function compareComparableResults(previous, current) {
  const comparable = ['testId', 'side', 'unit', 'protocolVersion'].every((key) => previous?.[key] === current?.[key]);
  return comparable ? { comparable: true, delta: current.value - previous.value } : { comparable: false, delta: null };
}
