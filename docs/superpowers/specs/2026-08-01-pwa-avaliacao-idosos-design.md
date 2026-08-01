# PWA de avaliações de idosos — especificação de design

**Status:** aguardando revisão do usuário  
**Data:** 2026-08-01  
**Base clínica inicial:** [`docs/referencias/PADRÃO-AVALIAÇÃO.pdf`](../../referencias/PADRÃO-AVALIAÇÃO.pdf)

## 1. Objetivo e limites

Criar uma PWA para uma equipe de quatro profissionais registrar, guardar, analisar e acompanhar avaliações físicas de pessoas idosas. O aplicativo atenderá ao uso recorrente em celular e exportará um relatório clínico em PDF por avaliação.

Esta primeira entrega cobre cadastro básico, avaliações funcionais, histórico, análise determinística, PDF e integração com Google Sheets por Apps Script. Anamnese, diagnósticos, medicamentos, controle de usuários/permissões e IA ficam fora do escopo. IA futura (Gemma/Gemini Lite) consumirá dados e cálculos já estruturados; não substituirá regras de protocolo nem julgamento profissional.

## 2. Princípios de produto

- A rotina frequente deve exigir poucos toques: localizar pessoa, selecionar testes, registrar e salvar.
- Uma avaliação contém somente os testes escolhidos naquela sessão.
- A coleta pode ser interrompida e retomada; a conclusão exige sincronização confirmada.
- Dados brutos e tentativas são preservados. Resultados, referências e interpretações derivadas são rastreáveis.
- O PDF deve primeiro comunicar de forma simples a aluno/familiar e, depois, oferecer detalhes técnicos para profissionais.
- O aplicativo não diagnostica, não prescreve e não cria classificações para testes sem referência configurada.

## 3. Fluxo diário aprovado

1. O profissional abre **Pessoas**, busca ou cria o cadastro e pode abrir o WhatsApp.
2. Em **Nova avaliação**, informa data de realização, seleciona um responsável do menu e marca os testes usados naquela pessoa/sessão.
3. O aplicativo cria o rascunho e abre os cartões dos testes selecionados. Cada cartão apresenta procedimento, unidade, tentativas e entrada compatível com aquele teste.
4. O profissional salva a qualquer momento. Rascunhos podem ser retomados, corrigidos e complementados com novos testes.
5. Ao concluir todos os registros desejados, preenche opcionalmente notas, revisa resultados e aguarda a sincronização. Somente então marca a avaliação como concluída.
6. Na tela da pessoa, o histórico compara avaliações compatíveis; o PDF pode ser gerado a partir da avaliação atual.

Atalhos na tela da pessoa: **Nova avaliação**, **Retomar rascunho** e **Histórico**.

## 4. Cadastro e equipe

### Pessoa avaliada

| Campo | Regra |
| --- | --- |
| `pessoaId` | Identificador interno imutável. |
| Nome completo | Obrigatório. |
| Data de nascimento | Obrigatória; calcula idade na data da avaliação. |
| Sexo | Obrigatório para referências que o usam, incluindo Step Test. |
| WhatsApp | Opcional, normalizado em formato internacional; abre `wa.me` sem envio automático. |
| Status | Ativo ou arquivado; o histórico nunca é apagado. |
| Criado em | Timestamp do servidor. |

Campos de diagnóstico, medicamentos, condições de saúde e demais dados exploratórios serão criados apenas no módulo futuro de anamnese.

### Profissional responsável

Campo obrigatório na avaliação, preenchido por menu fixo:

- Elohim
- Victor
- Lucas
- Carlos Eduardo

Não haverá perfis, permissões ou autenticação de aplicativo nesta etapa.

## 5. Estrutura dos dados no Google Sheets

Google Sheets é a base de dados central. A PWA não escreve diretamente nela: o Apps Script valida, calcula e grava por API JSON.

| Aba | Campos e finalidade principais |
| --- | --- |
| `Pessoas` | `pessoaId`, nome, nascimento, sexo, WhatsApp, status, criadoEm. |
| `Profissionais` | `profissionalId`, nome, ativo; inicia com os quatro nomes definidos. |
| `Avaliacoes` | `avaliacaoId`, `pessoaId`, data, `profissionalId`, status, notas dos testes, observações do aluno, criadoEm, ultimaAtualizacao. |
| `Resultados` | `resultadoId`, `avaliacaoId`, `testeId`, status, lado, valorOficial, unidade, classificação, referência/protocolo aplicados, motivo de não conclusão. |
| `Tentativas` | `tentativaId`, `resultadoId`, ordem, lado, valor, unidade, válida, criadaEm. |
| `CatalogoTestes` | `testeId`, nome, domínio, tipo de formulário, unidade, lateralidade, número de tentativas, regra de melhor resultado, versão. |
| `Referencias` | `referenciaId`, `testeId`, versão, critérios (idade/sexo), intervalos, classificação e vigência. |
| `Protocolos` | `protocoloId`, `testeId`, versão, texto de procedimento, tentativas, orientações e vigência. |

`Pessoas`, `Avaliacoes`, `Resultados` e `Tentativas` são históricos append-only na prática: edições atualizam o estado atual, mas não eliminam registros sem uma ação administrativa explícita.

## 6. Catálogo clínico inicial

Todos os itens ficam disponíveis na primeira versão, mas são selecionáveis por avaliação. O SPPB é sempre selecionado como um único conjunto.

| Teste | Registro e resultado oficial |
| --- | --- |
| Back Scratch (MMSS) | Distância em cm, negativa/zero/positiva; duas tentativas válidas por lado após familiarização; melhor valor por lado. |
| Chair Sit-and-Reach (MMII) | Distância em cm, negativa/zero/positiva e perna/lado; duas tentativas válidas por lado após familiarização; melhor valor por lado. |
| SPPB — Caminhada 4 m | Duas tentativas; melhor tempo em segundos e escore por tabela. |
| SPPB — Sentar e levantar 5x | Uma tentativa; tempo ou incapacidade e escore por tabela. |
| SPPB — Equilíbrio estático | Uma tentativa em cada posição; tempos/condições e escore por tabela. |
| 2-Minute Step Test | Uma tentativa; contagem de elevações do joelho direito em 2 minutos e referência por sexo/faixa etária. |
| Extensão isométrica de joelho | Dinamômetro de tensão em kgf, direito/esquerdo; procedimento, tentativas e referência a definir. |
| Remada isométrica | Dinamômetro de tensão em kgf, direito/esquerdo; procedimento, tentativas e referência a definir. |

Cada resultado guarda todas as tentativas no histórico PWA. O relatório mostra o resultado oficial de acordo com o protocolo, não a lista de tentativas.

### SPPB e referências

O formulário do SPPB deve abrir os três componentes juntos e mostrar seus escores separadamente. O escore total só será publicado depois de validação profissional das fronteiras no material de origem. A tabela de Sentar e Levantar do PDF apresenta uma possível inconsistência no primeiro intervalo; portanto, o registro de tempo será implementado desde o início, mas a classificação automática ficará desativada até a correção ser confirmada. As regras e referências serão tabelas versionadas, nunca valores dispersos no código.

## 7. Estados, notas e edição

### Estados da avaliação

- `rascunho`: em construção, com ou sem registros.
- `pendenteDeSincronizacao`: há alteração local não confirmada pelo servidor.
- `concluida`: todas as alterações foram sincronizadas e o profissional encerrou a sessão.

Uma avaliação concluída continua editável. Toda modificação atualiza `ultimaAtualizacao`; não há necessidade de registrar cada edição individual. Ao editar, é permitido adicionar testes à avaliação existente.

### Teste não concluído

Um teste selecionado pode ser marcado como não concluído. O motivo é obrigatório: dor, insegurança, intercorrência, recusa ou texto livre. O histórico e a parte técnica do PDF exibem a ocorrência, sem valor, escore ou classificação.

### Notas

- **Notas sobre os testes:** texto livre de logística, adaptação ou intercorrência. É interno e nunca sai no PDF.
- **Observações do profissional sobre o aluno:** texto livre por avaliação. Só aparece no PDF se preenchido, no fim da primeira página, após o resumo e antes dos detalhes técnicos.

## 8. Análises e monitoramento

Para cada pessoa, a tela de histórico mostra avaliações cronológicas, a última medida e evolução. Uma comparação só é calculada quando os dois resultados têm o mesmo teste, lado (quando aplicável), unidade e protocolo comparável.

Exibir:

- resultado oficial e unidade;
- classificação/referência quando disponível;
- diferença absoluta e direção desde a última avaliação comparável;
- aviso de amostra insuficiente, teste não realizado, protocolo diferente ou referência indisponível;
- diferença entre lados nos testes unilaterais, sem classificá-la como risco ou diagnóstico até que uma regra clínica seja definida.

## 9. Relatório clínico em PDF

O relatório representa o estado da avaliação no momento da geração e terá formato A4 adequado também à leitura em celular.

### Camada 1 — resumo acolhedor

Público: pessoa avaliada e familiar. Inclui identificação, data, mensagem explicativa neutra, cartões dos domínios testados e mudança desde avaliação anterior comparável. A linguagem evita “bom/ruim”, “apto/inapto”, diagnóstico e promessas. Ao final dessa página, inclui observações sobre o aluno quando existirem.

### Camada 2 — detalhamento técnico

Público: profissionais da equipe ou externos. Inclui profissional responsável, testes realizados, valor oficial, unidade, lados, classificação/referência, escore quando válido, evolução, situação de teste não concluído e dados técnicos necessários à interpretação. Testes não selecionados não são apresentados como falha; podem constar como “não realizado nesta avaliação” quando isso ajudar a contextualizar.

O PDF inclui aviso de que apoia o acompanhamento físico e não substitui avaliação médica. Itens sem referência aparecem como medida sem classificação.

O modelo em evolução está em [`docs/referencias/MODELO-RELATORIO-EM-EVOLUCAO.md`](../../referencias/MODELO-RELATORIO-EM-EVOLUCAO.md).

## 10. PWA, sincronização e recuperação

- Manifesto, ícones, tela responsiva e instalação em celular.
- Service worker para shell offline e fila local; não armazenar respostas clínicas da API em cache sem uma política explícita.
- Exibir sempre status: online, sincronizando, sincronizado ou envio pendente.
- Salvar rascunhos/alterações em armazenamento local antes da chamada de rede; a fila não terá prazo de expiração.
- Ao reconectar, reenviar em ordem e mostrar êxito ou erro por item.
- Falhas de validação indicam campo e motivo. Falhas de rede mantêm dados e oferecem nova tentativa; não podem ser silenciosas.
- Dados locais podem ser perdidos por remoção do PWA, limpeza do navegador ou falha/troca do aparelho. Assim, a aplicação só permite concluir após confirmação de gravação no Google Sheets.
- Em conflito de edição, preservar a versão do servidor, avisar o profissional e exigir recarregamento antes de nova gravação.

## 11. Contrato de API Apps Script

`doGet` e `doPost` retornam sempre JSON:

```json
{ "ok": true, "data": {}, "meta": { "updatedAt": "2026-08-01T00:00:00.000Z" } }
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "Campo obrigatório" } }
```

| Ação | Método | Responsabilidade |
| --- | --- | --- |
| `listPeople` | GET | Busca e pagina pessoas ativas/arquivadas. |
| `getPerson` | GET | Retorna cadastro, avaliações resumidas e última sincronização. |
| `savePerson` | POST | Cria ou atualiza cadastro com validação. |
| `createAssessment` | POST | Cria rascunho com pessoa, data, responsável e testes selecionados. |
| `getAssessment` | GET | Retorna avaliação, resultados, tentativas e protocolo aplicável. |
| `saveAssessment` | POST | Salva notas, testes, resultados e tentativas; usa `LockService`. |
| `completeAssessment` | POST | Valida e altera o estado para concluída após gravação confirmada. |
| `getHistory` | GET | Retorna séries comparáveis e avisos para análise. |
| `getCatalog` | GET | Retorna catálogo, protocolos e referências vigentes. |
| `generateReport` | POST | Produz o arquivo PDF de uma avaliação salva. |

O servidor adiciona timestamps, valida campos obrigatórios, aplica `LockService` em gravações concorrentes e devolve o registro salvo/identificador.

## 12. Verificação

1. **Regras e cálculos:** melhor tentativa, lateralidade, idade na data, Step Test, SPPB validado, comparabilidade e diferenças entre avaliações.
2. **API:** validações, formato JSON, timestamps, concorrência e rejeição de alteração inválida.
3. **Fluxos:** cadastro, seleção parcial de testes, SPPB em conjunto, rascunho, retomada offline, fila de reenvio, edição com teste adicional, teste não concluído, conclusão e PDF.
4. **PWA e apresentação:** instalação, viewport móvel, status offline, contraste, PDF em A4 e em celular, ausência de notas internas no PDF.

## 13. Pendências clínicas para não presumir

- Validar a tabela SPPB de Sentar e Levantar e as fronteiras da Caminhada de 4 m antes de liberar o cálculo automático correspondente.
- Fornecer protocolo, tentativas, melhor resultado e referências para extensão isométrica de joelho e remada.
- Definir identidade visual, nome do serviço e contato/assinatura que aparecerá no PDF.
