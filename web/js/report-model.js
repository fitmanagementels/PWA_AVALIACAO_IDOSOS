import { TESTS } from './domain.js';

const TEST_META = {
  'back-scratch': { domain: 'Flexibilidade', order: 3 },
  'chair-sit-reach': { domain: 'Flexibilidade', order: 3 },
  sppb: { domain: 'Mobilidade e equilíbrio', order: 1 },
  'step-2min': { domain: 'Capacidade cardiorrespiratória', order: 2, title: 'Teste de 2 minutos' },
  'knee-extension-isometric': { domain: 'Força', order: 4 },
  'rowing-isometric': { domain: 'Força', order: 4 }
};

const TEST_NAMES = Object.fromEntries(TESTS);
const SIDE_LABELS = {
  direito: 'Direito',
  esquerdo: 'Esquerdo',
  caminhada4m: 'Caminhada 4 m',
  sentarLevantar5x: 'Sentar e levantar',
  equilibrio: 'Equilíbrio',
  unico: ''
};
const SIDE_SHORT_LABELS = { direito: 'D', esquerdo: 'E' };
const SPPB_SUMMARY_LABELS = { caminhada4m: '4 m', sentarLevantar5x: '5x', equilibrio: 'Eq.' };

export function buildReportModel({ person = {}, assessment = {}, results = [], includedTestIds = [], isPendingSync = false }) {
  const selectedIds = new Set(includedTestIds || []);
  const tests = groupCompletedResults(results, selectedIds);
  const detailedTests = tests.map(toReportTest);
  const cards = detailedTests.map(({ testId, title, value, classification }) => ({ testId, title, value, classification }));
  return {
    meta: {
      name: person.name || 'Pessoa avaliada',
      age: ageAt(person.birthDate, assessment.date),
      date: assessment.date || '',
      updatedAt: assessment.updatedAt || assessment.ultimaAtualizacao || '',
      professionalName: assessment.professionalName || assessment.profissionalNome || '',
      isPendingSync: Boolean(isPendingSync)
    },
    summary: {
      cards,
      hasBilateral: detailedTests.some((test) => test.sides.some((side) => side.key === 'direito' || side.key === 'esquerdo')),
      studentObservations: String(assessment.studentObservations || assessment.observacoesAluno || '').trim() || null
    },
    technical: { domains: groupByDomain(detailedTests) }
  };
}

export function ageAt(birthDate, date) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(String(birthDate || '')) || !/^\d{4}-\d{2}-\d{2}/.test(String(date || ''))) return null;
  const birth = new Date(`${String(birthDate).slice(0, 10)}T12:00:00Z`);
  const at = new Date(`${String(date).slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(birth.getTime()) || Number.isNaN(at.getTime())) return null;
  return at.getUTCFullYear() - birth.getUTCFullYear() - Number(
    at.getUTCMonth() < birth.getUTCMonth()
    || (at.getUTCMonth() === birth.getUTCMonth() && at.getUTCDate() < birth.getUTCDate())
  );
}

function groupCompletedResults(results, selectedIds) {
  const rows = normalizeRows(results).filter((row) => row.status === 'concluido' && selectedIds.has(row.testId));
  return [...selectedIds].map((testId) => ({ testId, rows: rows.filter((row) => row.testId === testId) })).filter((group) => group.rows.length);
}

function normalizeRows(results) {
  return (results || []).flatMap((result) => {
    const testId = result.testId || result.testeId;
    const status = result.status;
    const unit = result.unit || result.unidade || '';
    const classification = result.classification || result.classificacao || '';
    const attempts = result.attempts || result.tentativas || [];
    const localSides = result.officialBySide;
    if (localSides && typeof localSides === 'object') return Object.entries(localSides).map(([side, officialValue]) => ({
      testId, status, side: side || 'unico', officialValue, unit, classification, attempts: attemptsForSide(attempts, side)
    }));
    return [{
      testId,
      status,
      side: result.side || result.lado || 'unico',
      officialValue: result.officialValue ?? result.valorOficial,
      unit,
      classification,
      attempts
    }];
  });
}

function attemptsForSide(attempts, side) {
  return (attempts || []).filter((attempt) => (attempt.side || attempt.lado || 'unico') === side);
}

function toReportTest({ testId, rows }) {
  const first = rows[0];
  const unit = displayUnit(testId, first.side, first.unit);
  return {
    testId,
    title: TEST_META[testId]?.title || TEST_NAMES[testId] || testId,
    domain: TEST_META[testId]?.domain || 'Outros resultados',
    order: TEST_META[testId]?.order || 99,
    value: valueText(testId, rows, unit),
    classification: rows.find((row) => row.classification)?.classification || null,
    unit,
    sides: rows.map((row) => ({
      key: row.side || 'unico',
      label: SIDE_LABELS[row.side || 'unico'] || titleCase(row.side || ''),
      value: formatNumber(row.officialValue),
      unit: displayUnit(testId, row.side, row.unit),
      attempts: (row.attempts || []).map((attempt, index) => ({
        order: Number(attempt.order ?? attempt.ordem ?? index + 1),
        value: formatNumber(attempt.value ?? attempt.valor)
      })).filter((attempt) => attempt.value !== '—')
    }))
  };
}

function valueText(testId, rows, unit) {
  if (testId === 'sppb') return rows.map((row) => `${SPPB_SUMMARY_LABELS[row.side] || SIDE_LABELS[row.side] || titleCase(row.side)} ${formatNumber(row.officialValue)} s`.trim()).join(' · ');
  if (rows.length === 1 && (rows[0].side || 'unico') === 'unico') return `${formatNumber(rows[0].officialValue)}${unit ? ` ${unit}` : ''}`.trim();
  return `${rows.map((row) => `${SIDE_SHORT_LABELS[row.side] || SIDE_LABELS[row.side] || titleCase(row.side)} ${formatNumber(row.officialValue)}`).join(' · ')}${unit ? ` ${unit}` : ''}`.trim();
}

function displayUnit(testId, side, unit) {
  return testId === 'sppb' && side !== 'unico' ? 's' : unit;
}

function groupByDomain(tests) {
  const groups = new Map();
  tests.forEach((test) => {
    const group = groups.get(test.domain) || { name: test.domain, order: test.order, tests: [] };
    group.tests.push(test);
    groups.set(test.domain, group);
  });
  return [...groups.values()].sort((a, b) => a.order - b.order).map((domain) => ({
    ...domain,
    tests: domain.tests.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'pt-BR'))
  }));
}

function formatNumber(value) {
  const number = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(number) ? new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(number) : '—';
}

function titleCase(value) {
  return String(value || '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
