export const TEST_DEFINITIONS = {
  'back-scratch': { title: 'Back Scratch', unit: 'cm', sides: ['direito', 'esquerdo'], attempts: 2, hint: 'Registre a melhor distância em cm para cada lado.' },
  'chair-sit-reach': { title: 'Chair Sit-and-Reach', unit: 'cm', sides: ['direito', 'esquerdo'], attempts: 2, hint: 'Registre a melhor distância em cm para cada perna.' },
  'step-2min': { title: '2-Minute Step Test', unit: 'elevações', sides: ['unico'], attempts: 1, hint: 'Conte as elevações do joelho direito em dois minutos.' },
  'knee-extension-isometric': { title: 'Extensão isométrica de joelho', unit: 'kgf', sides: ['direito', 'esquerdo'], attempts: 2, hint: 'Dinamômetro de tensão.' },
  'rowing-isometric': { title: 'Remada isométrica', unit: 'kgf', sides: ['direito', 'esquerdo'], attempts: 2, hint: 'Dinamômetro de tensão.' },
};

const SPPB = { title: 'SPPB', unit: 's', sides: [], attempts: 0, hint: 'Preencha caminhada, sentar e levantar e equilíbrio.' };
const SPPB_INPUTS = ['sppb-gait-1', 'sppb-gait-2', 'sppb-chair', 'sppb-feet', 'sppb-semi', 'sppb-tandem'];

export function testDefinition(testId) {
  return testId === 'sppb' ? SPPB : TEST_DEFINITIONS[testId];
}

export function testInputNames(testId) {
  if (testId === 'sppb') return SPPB_INPUTS;
  const definition = testDefinition(testId);
  return definition.sides.flatMap((side) => Array.from(
    { length: definition.attempts },
    (_, index) => `${testId}-${side}-${index + 1}`,
  ));
}

export function replaceTestDraftInputs(draftInputs, testId, values) {
  const names = new Set([...testInputNames(testId), `${testId}-not-completed`, `${testId}-reason`]);
  const next = Object.fromEntries(Object.entries(draftInputs || {}).filter(([name]) => !names.has(name)));
  return { ...next, ...values };
}

export function draftInputsForTest({ testId, draftInputs = {}, result = null }) {
  const saved = savedInputsForResult(testId, result);
  const names = new Set([...testInputNames(testId), `${testId}-not-completed`, `${testId}-reason`]);
  const local = Object.fromEntries(Object.entries(draftInputs).filter(([name]) => names.has(name)));
  return { ...saved, ...local };
}

export function testCardSummary({ testId, draftInputs = {}, result = null }) {
  const names = testInputNames(testId);
  const total = names.length;
  const reason = draftInputs[`${testId}-reason`] || result?.reason;
  if (draftInputs[`${testId}-not-completed`] === 'on' || result?.status === 'naoConcluido') {
    return { state: 'not-completed', text: `Não concluído${reason ? `: ${reason}` : ''}`, entered: 0, total };
  }

  const enteredNames = names.filter((name) => hasValue(draftInputs[name]));
  const entered = enteredNames.length;
  if (!entered && !result) return { state: 'empty', text: 'Nenhuma tentativa', entered, total };
  if (entered < total && !result) return { state: 'partial', text: `${entered} de ${total} campos preenchidos`, entered, total };
  if (testId === 'sppb') return { state: 'complete', text: `${total} de ${total} campos preenchidos`, entered: total, total };

  const definition = testDefinition(testId);
  const sides = definition.sides.filter((side) => side !== 'unico');
  if (!sides.length) {
    const value = result?.officialBySide?.unico ?? result?.officialValue ?? draftInputs[names[0]];
    return { state: 'complete', text: `${value} ${definition.unit}`, entered: total, total };
  }
  const values = Object.fromEntries(sides.map((side) => [side, bestValue(testId, side, draftInputs, result)]));
  const text = sides.map((side) => `${capitalize(side)}: ${values[side]} ${definition.unit}`).join(' · ');
  return { state: 'complete', text, entered: total, total };
}

function bestValue(testId, side, draftInputs, result) {
  const fromResult = result?.officialBySide?.[side];
  if (fromResult !== undefined && fromResult !== null) return fromResult;
  const values = testInputNames(testId)
    .filter((name) => name.includes(`-${side}-`))
    .map((name) => Number(String(draftInputs[name]).replace(',', '.')))
    .filter(Number.isFinite);
  return Math.max(...values);
}

function savedInputsForResult(testId, result) {
  if (!result) return {};
  if (result.status === 'naoConcluido') {
    return { [`${testId}-not-completed`]: 'on', [`${testId}-reason`]: result.reason || '' };
  }
  if (testId === 'sppb') return savedSppbInputs(result.attempts || []);

  const definition = testDefinition(testId);
  return definition.sides.reduce((inputs, side) => {
    const attempts = (result.attempts || [])
      .filter((attempt) => (attempt.side || 'unico') === side)
      .sort((first, second) => (first.order || 0) - (second.order || 0));
    attempts.slice(0, definition.attempts).forEach((attempt, index) => {
      inputs[`${testId}-${side}-${index + 1}`] = attempt.value;
    });
    return inputs;
  }, {});
}

function savedSppbInputs(attempts) {
  const bySide = (side) => attempts
    .filter((attempt) => attempt.side === side)
    .sort((first, second) => (first.order || 0) - (second.order || 0));
  const inputs = {};
  bySide('caminhada4m').slice(0, 2).forEach((attempt, index) => { inputs[`sppb-gait-${index + 1}`] = attempt.value; });
  const chair = bySide('sentarLevantar5x')[0];
  const tandem = bySide('equilibrio')[0];
  if (chair) inputs['sppb-chair'] = chair.value;
  if (tandem) inputs['sppb-tandem'] = tandem.value;
  return inputs;
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
