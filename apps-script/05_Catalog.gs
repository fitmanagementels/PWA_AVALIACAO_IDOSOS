const STEP_TEST_REFERENCES = {
  masculino: [
    { from: 60, to: 64, averageMinimum: 87, averageMaximum: 115 }, { from: 65, to: 69, averageMinimum: 86, averageMaximum: 116 },
    { from: 70, to: 74, averageMinimum: 80, averageMaximum: 110 }, { from: 75, to: 79, averageMinimum: 73, averageMaximum: 109 },
    { from: 80, to: 84, averageMinimum: 71, averageMaximum: 103 }, { from: 85, to: 89, averageMinimum: 59, averageMaximum: 91 },
    { from: 90, to: 94, averageMinimum: 52, averageMaximum: 86 }
  ],
  feminino: [
    { from: 60, to: 64, averageMinimum: 75, averageMaximum: 107 }, { from: 65, to: 69, averageMinimum: 73, averageMaximum: 107 },
    { from: 70, to: 74, averageMinimum: 68, averageMaximum: 101 }, { from: 75, to: 79, averageMinimum: 68, averageMaximum: 100 },
    { from: 80, to: 84, averageMinimum: 60, averageMaximum: 91 }, { from: 85, to: 89, averageMinimum: 55, averageMaximum: 85 },
    { from: 90, to: 94, averageMinimum: 44, averageMaximum: 72 }
  ]
};

const INITIAL_CATALOG = [
  { id: 'back-scratch', name: 'Back Scratch (MMSS)', domain: 'Flexibilidade', unit: 'cm', bilateral: true, validAttempts: 2, familiarizationAttempts: 2, bestDirection: 'highest' },
  { id: 'chair-sit-reach', name: 'Chair Sit-and-Reach (MMII)', domain: 'Flexibilidade', unit: 'cm', bilateral: true, validAttempts: 2, familiarizationAttempts: 2, bestDirection: 'highest' },
  { id: 'sppb', name: 'SPPB', domain: 'Multicomponente', unit: 'score', bundle: true, children: ['sppb-gait-4m', 'sppb-chair-stand-5x', 'sppb-static-balance'] },
  { id: 'sppb-gait-4m', name: 'Caminhada de 4 metros', domain: 'SPPB', unit: 's', validAttempts: 2, bestDirection: 'lowest' },
  { id: 'sppb-chair-stand-5x', name: 'Sentar e levantar 5 vezes', domain: 'SPPB', unit: 's', validAttempts: 1, manualReviewRequired: true },
  { id: 'sppb-static-balance', name: 'Equilíbrio estático', domain: 'SPPB', unit: 's', validAttempts: 1 },
  { id: 'step-2min', name: '2-Minute Step Test', domain: 'Aptidão cardiorrespiratória', unit: 'contagem', validAttempts: 1 },
  { id: 'knee-extension-isometric', name: 'Extensão isométrica de joelho', domain: 'Força', unit: 'kgf', bilateral: true, bestDirection: 'highest', protocolStatus: 'pendente-clinico' },
  { id: 'rowing-isometric', name: 'Remada isométrica', domain: 'Força', unit: 'kgf', bilateral: true, bestDirection: 'highest', protocolStatus: 'pendente-clinico' }
];
