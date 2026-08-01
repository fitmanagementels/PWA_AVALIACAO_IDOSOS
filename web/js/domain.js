export const PROFESSIONALS = ['Elohim', 'Victor', 'Lucas', 'Carlos Eduardo'];
export const TESTS = [
  ['back-scratch', 'Back Scratch'], ['chair-sit-reach', 'Chair Sit-and-Reach'], ['sppb', 'SPPB'],
  ['step-2min', '2-Minute Step Test'], ['knee-extension-isometric', 'Extensão isométrica de joelho'], ['rowing-isometric', 'Remada isométrica']
];
export function whatsAppUrl(number) { const value = String(number || '').replace(/\D/g, ''); return /^\d{10,15}$/.test(value) ? `https://wa.me/${value}` : null; }
export function buildAssessmentStart({ personId, professionalName, testIds }) { if (!personId || !PROFESSIONALS.includes(professionalName) || !testIds?.length) throw new Error('Selecione pessoa, responsável e ao menos um teste'); return { personId, professionalName, testIds }; }
