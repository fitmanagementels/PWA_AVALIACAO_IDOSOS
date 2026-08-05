# Central de atendimentos XSTEAM — design

## Objetivo

Reposicionar a tela inicial do PWA como uma central de atendimentos clínicos: o profissional localiza ou cadastra uma pessoa, retoma um rascunho real quando disponível e inicia ou consulta avaliações sem abandonar o fluxo já funcional.

## Referências analisadas

O pacote do Stitch apresentou Operacional Minimalista, Clínico Premium e Precisão Editorial, em Pessoas, Nova avaliação e Histórico. A direção resultante combina:

- Operacional Minimalista como base de navegação, busca, lista e status conciso.
- Clínico Premium como acabamento de superfícies, filtros próprios e cartões de teste.
- Precisão Editorial como ritmo tipográfico, tabela desktop e timeline; não como dashboard analítico.

Não serão copiados fotos de pacientes, scores, prontidão, alertas, protocolos, métricas agregadas, sidebar ou abas globais que não correspondem aos dados e rotas atuais.

## Direção aprovada

### Central de atendimentos

A rota inicial deixa de ser somente uma lista chamada “Pessoas” e passa a ter o papel de “Atendimentos”. A composição é mobile-first: barra de produto, card de rascunho apenas se houver rascunho local, busca, CTA “Nova pessoa” e diretório. A central não mostra KPIs; ela mostra o próximo trabalho que o sistema realmente conhece.

Cada pessoa no diretório apresenta apenas informações existentes ou deriváveis: nome, dados mínimos do cadastro, rascunho local, ausência de avaliação local ou última avaliação conhecida no cache. Selecionar uma pessoa continua levando às ações já existentes: nova avaliação, retomar rascunho e histórico.

### Nova avaliação

O fluxo permanece pessoa → sessão → testes. A sessão reúne data e profissional; em seguida, os testes permanecem uma seleção múltipla, sem criar uma camada fictícia de protocolos. Os cartões usam o tratamento técnico do Stitch, mas não recebem categoria, descrição ou métrica que o catálogo atual não possua. A ação “Iniciar avaliação” torna-se fixada no fim do viewport somente após uma seleção válida.

### Histórico

O histórico adota uma timeline cronológica por mês, com filtro de teste, status real, profissional e quantidade/nomes de testes. Não haverá score global nem indicadores de tendência até que regras clínicas e agregações sejam implementadas no backend. No desktop, a lista pode receber detalhe contextual, mantendo os mesmos dados.

## Restrições preservadas

- Não mudar schema de planilha, Apps Script, fila offline, valores de formulário, regras clínicas ou geração de PDF.
- Não introduzir métricas clínicas calculadas, classificações novas, agenda, fotos de pessoas ou navegação global sem suporte de dados.
- Manter dark XSTEAM, logo original e lime `#E2FF42` para marca, ação clínica, foco e seleção.
- Preservar menu próprio, comportamento de teclado, bottom sheet mobile e cache offline já implementados.

## Verificação futura

- Dados exibidos na central correspondem a registros locais, cache ou backend; nenhum estado é decorativo.
- Mobile mantém coluna única, 48 px de toque e nenhuma rolagem horizontal.
- Desktop troca somente o diretório e o histórico densos para tabela/lista; o fluxo clínico permanece linear.
- Testes cobrem o card de rascunho, os estados vazios e a ausência de métricas inventadas; inspeção visual cobre as três telas em mobile e desktop.
