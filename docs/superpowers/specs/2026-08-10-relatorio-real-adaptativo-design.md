# Relatório real e adaptativo — design

## Objetivo

Substituir o gerador básico em Google Docs pelo relatório visual A5 dentro do PWA. O relatório usa os dados reais da avaliação, adapta a estrutura à quantidade de testes selecionados e é salvo/compartilhado pelo diálogo nativo de impressão do dispositivo.

## Decisões aprovadas

- O fluxo é: selecionar testes concluídos → visualizar relatório → salvar ou compartilhar PDF pelo dispositivo.
- Testes não concluídos não aparecem na seleção nem no documento.
- A prévia usa os dados locais mais recentes quando houver alterações pendentes e apresenta um aviso discreto de sincronização pendente.
- O relatório não possui número fixo de páginas. Cartões e blocos técnicos quebram naturalmente, sem páginas vazias ou escala reduzida artificialmente.
- O visual aprovado do modelo A5 é a referência: fundo de página contínuo, capa compacta, logo colorida, resultados objetivos, detalhes técnicos e rodapé rastreável.
- Notas internas de teste nunca entram no relatório. Observações do profissional só aparecem quando preenchidas.
- O gerador de Google Docs atual não será removido neste pacote, mas deixa de ser chamado pelo PWA.

## Fluxo diário

1. O profissional abre uma avaliação salva no histórico.
2. Toca em “Exportar relatório PDF”.
3. O PWA mostra apenas os testes cujo resultado possui status `concluido`; todos começam selecionados.
4. Ao confirmar, o PWA monta o modelo a partir da versão local da avaliação, quando existir; caso contrário, usa a avaliação recebida do Apps Script.
5. A tela “Prévia do relatório” exibe o documento em leitura contínua e duas ações: voltar e salvar/compartilhar PDF.
6. “Salvar/compartilhar PDF” chama `window.print()`. O CSS de impressão produz páginas A5 sem a interface do PWA.

## Arquitetura

### Fonte de dados

`getAssessment` continua sendo a leitura compartilhada de pessoa, avaliação, resultados e tentativas. Na abertura da prévia, o frontend procura `assessment:<avaliacaoId>` em `localStorage`; se houver uma cópia local, ela vence os dados remotos para o relatório. `hasPendingAssessmentMutation(avaliacaoId)` determina se o aviso de sincronização deve ser exibido.

### Modelo de relatório

Criar `web/js/report-model.js` como módulo puro. Ele recebe `{ person, assessment, results, includedTestIds, isPendingSync }` e devolve:

- `meta`: nome, idade na data da avaliação, data da sessão, data/hora da última atualização, profissional e estado de sincronização;
- `summary`: resultados concluídos agrupados por `testId`, observações do profissional e cartões de resultado;
- `technical`: blocos agrupados por domínio e ordenados conforme o catálogo de testes.

Para resultados bilaterais, o agrupamento mantém os dois lados no mesmo bloco de teste. O valor oficial é sempre usado como destaque; as tentativas são mostradas somente no detalhamento técnico. Se uma classificação não existe, o rótulo é “Sem referência cadastrada”.

### Interface e impressão

Criar `web/js/views/report-preview.js` para renderizar a tela e `web/styles/report.css` para o documento. A prévia reaproveita a identidade XSTEAM, mas é isolada por classes `report-*`.

`@media print` oculta cabeçalho, dock de sincronização e controles. `@page` define A5 em retrato, sem cabeçalhos do navegador. Cada cartão técnico usa `break-inside: avoid`; o navegador decide a quebra de página com base no conteúdo real.

### Alteração no fluxo existente

`web/js/views/people.js` deixa de chamar `request('generateReport')`. Após a confirmação de seleção, ele chama a prévia com pessoa, avaliação, resultados, IDs incluídos e estado de sincronização. A lista de seleção é derivada dos resultados concluídos, não de todos os testes originalmente selecionados na sessão.

## Estados e erros

- Sem resultados concluídos: a ação de relatório informa que não há testes elegíveis e não abre seleção vazia.
- Falha na leitura remota: o comportamento atual de histórico permanece; a prévia só é oferecida quando há avaliação carregada.
- Sincronização pendente: a prévia mostra “Dados deste aparelho ainda não sincronizados” e mantém a exportação habilitada.
- Falha no diálogo de impressão: nenhuma informação é perdida; a prévia continua aberta e informa que o salvamento depende do suporte do dispositivo.

## Validação

- Testes unitários para agrupamento de resultados, cálculo de idade, exclusão de notas internas, somente concluídos e bilateralidade.
- Testes de interface para seleção baseada em resultados concluídos e abertura da prévia sem chamada a `generateReport`.
- Testes de CSS/markup para regras de impressão A5, controles ocultos e `break-inside: avoid`.
- Verificação manual com 1, 3, 6 e mais testes, observações ausentes/longas e sincronização pendente.
