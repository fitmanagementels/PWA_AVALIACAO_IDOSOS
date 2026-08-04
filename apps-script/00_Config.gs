const SHEETS = {
  PEOPLE: 'Pessoas',
  PROFESSIONALS: 'Profissionais',
  ASSESSMENTS: 'Avaliacoes',
  RESULTS: 'Resultados',
  ATTEMPTS: 'Tentativas',
  HISTORY_SUMMARIES: 'HistoricoResumo',
  CATALOG: 'CatalogoTestes',
  REFERENCES: 'Referencias',
  PROTOCOLS: 'Protocolos'
};

const ASSESSMENT_STATUS = ['rascunho', 'pendenteDeSincronizacao', 'concluida'];
const RESULT_STATUS = ['concluido', 'naoConcluido'];

const PROFESSIONALS = ['Elohim', 'Victor', 'Lucas', 'Carlos Eduardo'];

const SHEET_HEADERS = {
  Pessoas: ['pessoaId', 'nomeCompleto', 'dataNascimento', 'sexo', 'whatsApp', 'status', 'criadoEm'],
  Profissionais: ['profissionalId', 'nome', 'ativo'],
  Avaliacoes: ['avaliacaoId', 'pessoaId', 'data', 'profissionalNome', 'status', 'testesSelecionados', 'notasTestes', 'observacoesAluno', 'criadoEm', 'ultimaAtualizacao'],
  Resultados: ['resultadoId', 'avaliacaoId', 'testeId', 'status', 'lado', 'valorOficial', 'unidade', 'classificacao', 'protocoloVersao', 'motivoNaoConcluido'],
  Tentativas: ['tentativaId', 'resultadoId', 'ordem', 'lado', 'valor', 'unidade', 'valida', 'criadoEm'],
  HistoricoResumo: ['resumoId', 'pessoaId', 'avaliacaoId', 'data', 'profissionalNome', 'status', 'testesSelecionados', 'resultadosResumoJson', 'ultimaAtualizacao'],
  CatalogoTestes: ['testeId', 'nome', 'dominio', 'unidade', 'configuracaoJson'],
  Referencias: ['referenciaId', 'testeId', 'versao', 'criteriosJson', 'classificacao', 'vigencia'],
  Protocolos: ['protocoloId', 'testeId', 'versao', 'texto', 'configuracaoJson', 'vigencia']
};
