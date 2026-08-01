# PWA de Avaliações de Idosos — estrutura em evolução

> Documento de trabalho. Registra decisões já confirmadas e propostas a validar durante o desenho do produto. Não substitui protocolo clínico nem interpretação profissional.

## 1. Objetivo

Registrar, guardar, analisar e acompanhar avaliações físicas de pessoas idosas atendidas por personal trainer. Cada avaliação deve preservar os resultados brutos, aplicar as regras de cada teste e gerar um relatório clínico legível tanto pela pessoa avaliada quanto por outros profissionais.

O aplicativo será uma PWA de uso móvel recorrente, com sincronização por Google Apps Script e armazenamento estruturado no Google Sheets. A futura integração com Gemini Lite/Gemma será complementar: ela deverá gerar sugestões de insights sobre dados já calculados e nunca substituir a regra de pontuação do protocolo nem o julgamento profissional.

## 2. Escopo da primeira entrega

1. Cadastro básico da pessoa avaliada.
2. Início, preenchimento, edição e consulta de uma avaliação.
3. Seleção dos testes que serão aplicados em cada avaliação.
4. Cálculo e classificação determinísticos para os testes que já têm referências.
5. Histórico por pessoa e comparação entre avaliações.
6. Relatório clínico em PDF por avaliação.
7. Atalho para conversa no WhatsApp da pessoa cadastrada.

Ficam fora desta entrega: anamnese, diagnósticos, medicamentos, cadastro de condições de saúde e análise por IA.

## 3. Cadastro da pessoa avaliada

O cadastro inicial será enxuto e conterá apenas identificação e contato. Campos clínicos/exploratórios serão tratados no futuro módulo de anamnese, separado das avaliações funcionais.

| Campo | Uso |
| --- | --- |
| ID da pessoa | Identificador interno estável |
| Nome completo | Identificação na busca e no relatório |
| Data de nascimento | Cálculo da idade na data da avaliação e escolha da referência etária |
| Sexo | Escolha das referências específicas do 2-Minute Step Test |
| WhatsApp | Link direto para abrir a conversa |
| Data de cadastro | Auditoria administrativa |
| Status | Ativo ou arquivado, sem apagar o histórico |

O número de WhatsApp será salvo em formato internacional e o botão abrirá `https://wa.me/<numero>`. O aplicativo não enviará mensagens automaticamente.

## 4. Avaliação: fluxo de trabalho

Uma avaliação representa uma sessão clínica de uma pessoa, mesmo que haja interrupção e ela seja concluída depois.

1. O profissional busca ou cadastra a pessoa.
2. Seleciona **Nova avaliação** e escolhe somente os testes que serão utilizados naquela sessão.
3. O aplicativo cria uma avaliação em rascunho com data de realização e data/hora de última alteração.
4. O profissional preenche os testes selecionados; cada formulário apresenta protocolo, unidade, número de tentativas e campos que pertencem somente àquele teste.
5. Se houver intercorrência, salva o rascunho e retoma posteriormente.
6. Na edição, pode corrigir resultados já inseridos e adicionar novos testes ao conjunto selecionado.
7. Ao concluir, a avaliação permanece editável. O sistema atualiza somente `ultimaAtualizacao`; não será mantido histórico por alteração individual.
8. A pessoa e a equipe consultam o histórico; o PDF é gerado a partir do estado atual da avaliação.

Cada avaliação terá também dois blocos de texto livre:

- **Notas sobre os testes:** logística, intercorrências e adaptações ocorridas durante a sessão. É um registro interno e nunca entra no PDF.
- **Observações do profissional sobre o aluno:** informações adicionais observadas. Entram no PDF somente se preenchidas, no fim da página inicial, depois do resumo simplificado e antes do detalhamento técnico.

O fluxo acima foi aprovado para a primeira entrega. Na tela da pessoa, os atalhos principais serão **Nova avaliação**, **Retomar rascunho** e **Histórico**.

### Regras de integridade

- Uma avaliação não exige todos os testes do catálogo.
- Testes não selecionados não aparecem como resultado ausente no relatório; eles aparecem, quando necessário, como “não realizado nesta avaliação”.
- Uma avaliação em rascunho não entra em tendências clínicas até possuir pelo menos um resultado válido.
- Resultados já salvos nunca são substituídos por valores de referência novos; a referência aplicada e a versão do protocolo devem acompanhar o resultado no futuro modelo de dados.
- Se um teste selecionado não puder ser concluído, o profissional poderá marcá-lo como “não concluído” e registrará o motivo (dor, insegurança, intercorrência, recusa ou texto livre). Essa ocorrência aparece no detalhamento técnico do PDF.

## 5. Catálogo obrigatório inicial de testes

Todos os testes abaixo estarão disponíveis na primeira entrega, mas a escolha por avaliação é individual.

| Grupo | Teste | Registro principal | Tentativas e resultado oficial |
| --- | --- | --- | --- |
| Flexibilidade | Back Scratch (MMSS) | Distância em cm, por lado; valor negativo, zero ou positivo | Duas tentativas válidas por lado, após duas familiarizações; melhor valor de cada lado |
| Flexibilidade | Chair Sit-and-Reach (MMII) | Distância em cm e perna usada; valor negativo, zero ou positivo | Duas tentativas válidas por lado, após duas familiarizações; melhor valor por lado |
| SPPB | Caminhada de 4 metros | Melhor tempo em segundos | Duas tentativas; cálculo de escore de 0 a 4 |
| SPPB | Sentar e levantar 5 vezes | Tempo em segundos ou incapacidade | Uma tentativa; cálculo de escore de 0 a 4 |
| SPPB | Equilíbrio estático | Tempo/condição em pés juntos, semi-tandem e tandem | Uma tentativa por posição; cálculo de escore de 0 a 4 |
| Aptidão cardiorrespiratória | 2-Minute Step Test | Número de elevações do joelho direito em 2 minutos | Uma tentativa; classificação por idade e sexo |
| Força isométrica máxima | Extensão de joelho | Força em kgf, lado direito e esquerdo | Protocolo, tentativas e referências ainda serão definidos |
| Força isométrica máxima | Remada | Força em kgf, lado direito e esquerdo | Protocolo, tentativas e referências ainda serão definidos |

Os dois testes de força usarão dinamômetro de tensão. A estrutura deve guardar cada tentativa e identificar o maior valor oficial, mas não classificará o resultado até que o protocolo seja fornecido.

### Referências já transcritas do documento-base

**SPPB — Caminhada de 4 m:** até 4,82 s = 4; 4,83–6,20 s = 3; 6,21–8,70 s = 2; acima de 8,70 s = 1; incapaz = 0. A fronteira entre 8,70 s e “acima de 8,70 s” será confirmada na modelagem para evitar ambiguidade do material-fonte.

**SPPB — Sentar e levantar 5 vezes:** o documento fonte registra “≥ 11,19 s = 4” e “11,20–13,69 s = 3”, o que aparenta uma inversão no primeiro sinal. Esta tabela será marcada para validação profissional antes de automatizar qualquer escore.

**SPPB — Equilíbrio estático:** 3 posições por 10 s = 4; 2 = 3; 1 = 2; nenhuma = 1; incapaz de tentar = 0.

**2-Minute Step Test:** a classificação será automática com as faixas do PDF, por sexo e intervalo de idade de cinco anos (60–64 até 90–94). Os valores serão cadastrados em tabela de referência versionada, não dispersos no código.

## 6. Análise e acompanhamento

Cada tela da pessoa mostrará a última avaliação e o histórico cronológico. A análise exibirá resultado bruto, unidade, classificação quando houver referência, evolução absoluta e variação desde a avaliação anterior comparável.

Comparações só serão feitas entre o mesmo teste, mesmo lado quando aplicável e mesma unidade. Quando houver poucos dados, teste não realizado ou alteração de protocolo, a interface mostrará a limitação em vez de inferir melhora ou piora.

Para força unilateral, será mostrada também a diferença entre lados, sem rotulá-la como risco ou diagnóstico até que a regra clínica seja definida.

## 7. Relatório clínico em PDF

Cada PDF retratará uma avaliação específica no momento de sua geração e será organizado em duas camadas:

1. **Resumo para a pessoa avaliada e familiar:** abre o documento com mensagem simples, indicadores visuais de evolução quando houver comparação e uma lista clara do que foi avaliado. Essa primeira leitura deve ser convidativa e explicativa.
2. **Registro técnico para profissionais:** vem depois do resumo e preserva identificação, data, testes realizados, valores brutos, lados, tentativas quando relevantes, referência utilizada, classificação, escores SPPB e observações do avaliador. Ele atende a consulta por profissionais da equipe ou externos.

O relatório não exibirá diagnóstico automático. Itens sem referência aparecerão como valor mensurado e “sem classificação de referência cadastrada”. Testes não aplicados serão separados dos itens sem resultado para não sugerir falha na execução.

O modelo vivo de conteúdo, hierarquia e exemplos está em `MODELO-RELATORIO-EM-EVOLUCAO.md` nesta mesma pasta.

## 8. Arquitetura prevista

- **PWA HTML/CSS/JavaScript:** interface responsiva, instalável e orientada ao uso em celular.
- **Google Apps Script:** API JSON para leitura e gravação, com validação no servidor e proteção contra gravações simultâneas.
- **Google Sheets:** tabelas de pessoas, avaliações, resultados por teste, tentativas, catálogo de testes e referências versionadas.
- **Modo offline:** formulário e rascunhos disponíveis localmente; envios pendentes visíveis e reenviados quando a conexão retornar. Dados de análise e API não ficarão em cache sem regra de atualização explícita.
- **PDF:** geração a partir de um modelo de relatório com valores, tabelas e explicações simplificadas.

### Acesso compartilhado

O aplicativo não terá perfis, permissões internas ou restrição de acesso nesta fase. A proteção de acesso ficará fora do escopo inicial e deverá ser retomada antes de qualquer ampliação de uso ou compartilhamento amplo de dados.

### Sincronização, falhas e recuperação

- A PWA informa visualmente se está online, sincronizando, sincronizada ou com envio pendente.
- Rascunhos e alterações recentes são guardados localmente antes da tentativa de envio.
- Sem conexão, a pessoa responsável pode continuar preenchendo a avaliação; o envio é colocado em uma fila local sem prazo de expiração e reenviado quando houver conexão.
- A fila offline persiste enquanto os dados do navegador/PWA permanecerem no aparelho. Remoção do aplicativo, limpeza dos dados do navegador, falha ou troca do aparelho podem apagá-la; portanto, um dado só é considerado protegido de perda depois de sincronizado com a planilha.
- Uma falha de validação mostra o campo e o motivo; uma falha de rede mantém o conteúdo salvo e oferece nova tentativa, sem descarte silencioso.
- Em conflito de edição, o servidor preserva a versão já salva e informa que a avaliação foi atualizada por outro profissional. A tela oferece recarregar os dados antes de uma nova gravação.
- Antes de gerar PDF ou concluir uma avaliação, o aplicativo valida campos obrigatórios, tipos de unidade, laterais, tentativas exigidas e motivos de teste não concluído.

### Verificação da primeira entrega

1. Testes unitários para cálculo de melhor tentativa, regras SPPB, referências do Step Test, idade na data da avaliação e comparação de histórico.
2. Testes da API Apps Script para validação, concorrência e retornos JSON de sucesso/erro.
3. Testes de fluxo: cadastro, avaliação parcial, rascunho offline, retomada, edição com inclusão de teste, teste não concluído e geração de PDF.
4. Verificação manual de instalação PWA, tela pequena, contraste/legibilidade e leitura do PDF em celular e A4.

Esta estrutura híbrida foi aprovada: os testes atuais terão telas específicas e guiadas, enquanto o catálogo central guardará a configuração que permite acrescentar testes e referências sem alterar resultados históricos.

### Abas do Google Sheets (base de dados central)

| Aba | Finalidade |
| --- | --- |
| `Pessoas` | Cadastro básico, identificador e status da pessoa avaliada. |
| `Profissionais` | Lista fixa inicial: Elohim, Victor, Lucas e Carlos Eduardo. |
| `Avaliacoes` | Cabeçalho de cada sessão: pessoa, data, responsável, status, notas e última atualização. |
| `Resultados` | Um registro por teste selecionado, com resultado oficial, status, lado e regra aplicada. |
| `Tentativas` | Todas as tentativas por resultado, preservadas para consulta no PWA. |
| `CatalogoTestes` | Definições de teste: unidade, lateralidade, quantidade de tentativas e tipo de formulário. |
| `Referencias` | Faixas de referência versionadas, por exemplo idade e sexo no 2-Minute Step Test. |
| `Protocolos` | Texto de procedimento e versão do protocolo exibida no aplicativo. |

As abas de dados (`Pessoas`, `Avaliacoes`, `Resultados` e `Tentativas`) são registros de histórico. O Apps Script será a única camada que escreve nelas; a PWA não manipulará a planilha diretamente.

## 9. Pendências que precisam de definição

- Procedimento, quantidade de tentativas, critério de melhor resultado e referências para extensão isométrica de joelho e remada.
- Validação das faixas SPPB antes de automatizar sua pontuação.
- Campos mínimos de identificação além dos já definidos, como e-mail ou foto, se vierem a ser necessários.
- Identidade visual, nome da marca e dados do profissional que assina o relatório.
- Regras de conclusão, assinatura e compartilhamento do relatório.
