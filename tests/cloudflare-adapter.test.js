import assert from 'node:assert/strict';
import test from 'node:test';

test('converte o formato legado da avaliação para o contrato Cloudflare', async () => {
  const { toCloudflarePayload } = await import('../web/js/cloudflare-adapter.js');
  const payload = toCloudflarePayload('saveAssessment', {
    avaliacaoId: 'assessment-1',
    pessoaId: 'person-1',
    data: '2026-08-27',
    profissionalNome: 'Carlos Eduardo',
    testesSelecionados: ['knee-extension-isometric'],
    notasTestes: 'Dinamômetro calibrado.',
    observacoesAluno: 'Sem intercorrências.',
    resultados: [{
      resultadoId: 'assessment-1:knee-extension-isometric:direito',
      testeId: 'knee-extension-isometric',
      status: 'concluido',
      lado: 'direito',
      valorOficial: 20,
      unidade: 'kgf',
      tentativas: [{ tentativaId: 'attempt-1', ordem: 1, lado: 'direito', valor: 20, unidade: 'kgf', valida: true }]
    }]
  });

  assert.deepEqual(payload, {
    id: 'assessment-1',
    personId: 'person-1',
    assessmentDate: '2026-08-27',
    professionalId: 'professional-carlos-eduardo',
    testIds: ['knee-extension-isometric'],
    testNotes: 'Dinamômetro calibrado.',
    studentObservations: 'Sem intercorrências.',
    results: [{
      id: 'assessment-1:knee-extension-isometric:direito', assessmentId: 'assessment-1', testId: 'knee-extension-isometric',
      status: 'concluido', side: 'direito', officialValue: 20, unit: 'kgf', classification: '', protocolVersion: 1,
      nonCompletionReason: '', referenceId: '', referenceVersion: null, referenceApplicationJson: '',
      attempts: [{ id: 'attempt-1', ordinal: 1, side: 'direito', value: 20, unit: 'kgf', valid: true }]
    }]
  });
});

test('converte a resposta Cloudflare para o formato consumido pelo PWA atual', async () => {
  const { fromCloudflareResponse } = await import('../web/js/cloudflare-adapter.js');
  const response = fromCloudflareResponse('getAssessment', {
    ok: true,
    data: {
      assessment: {
        id: 'assessment-1', personId: 'person-1', assessmentDate: '2026-08-27', professionalId: 'professional-elohim',
        professionalName: 'Elohim', status: 'rascunho', testIds: ['back-scratch'], testNotes: 'Notas',
        studentObservations: 'Observação', createdAt: '2026-08-27T13:00:00.000Z', updatedAt: '2026-08-27T14:00:00.000Z'
      },
      results: [{
        id: 'result-1', assessmentId: 'assessment-1', testId: 'back-scratch', status: 'concluido', side: 'direito',
        officialValue: 23, unit: 'cm', classification: 'adequado', protocolVersion: 1, nonCompletionReason: '',
        attempts: [{ id: 'attempt-1', ordinal: 1, side: 'direito', value: 23, unit: 'cm', valid: true }]
      }]
    }
  });

  assert.equal(response.data.assessment.avaliacaoId, 'assessment-1');
  assert.deepEqual(response.data.assessment.testesSelecionados, ['back-scratch']);
  assert.equal(response.data.results[0].resultadoId, 'result-1');
  assert.equal(response.data.results[0].tentativas[0].tentativaId, 'attempt-1');
});

test('converte histórico, rascunhos e fluxo para os nomes já usados pelas telas', async () => {
  const { fromCloudflareResponse } = await import('../web/js/cloudflare-adapter.js');
  const history = fromCloudflareResponse('getHistorySummary', {
    ok: true,
    data: [{
      assessment: { id: 'assessment-1', personId: 'person-1', assessmentDate: '2026-08-27', professionalId: 'professional-victor', status: 'concluida', testIds: ['sppb'] },
      results: [{ id: 'result-1', assessmentId: 'assessment-1', testId: 'sppb', status: 'concluido', side: '', officialValue: 9, unit: 'pontos', attempts: [] }]
    }]
  });
  assert.equal(history.data[0].avaliacaoId, 'assessment-1');
  assert.deepEqual(JSON.parse(history.data[0].resultadosResumoJson).map((row) => row.testeId), ['sppb']);

  const flow = fromCloudflareResponse('getPersonFlow', {
    ok: true,
    data: { activeDraft: { id: 'assessment-2', assessmentDate: '2026-08-27', professionalId: 'professional-lucas', status: 'rascunho' }, latestCompleted: null }
  });
  assert.equal(flow.data.rascunhoAtivo.avaliacaoId, 'assessment-2');
  assert.equal(flow.data.rascunhoAtivo.profissionalNome, 'Lucas');
});
