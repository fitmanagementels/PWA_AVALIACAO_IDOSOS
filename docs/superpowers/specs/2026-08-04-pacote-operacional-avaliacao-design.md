# Pacote operacional de atualização — PWA Avaliação de Idosos

**Data:** 2026-08-04
**Status:** aprovado para especificação; aguarda revisão do documento e plano de execução.

## Objetivo

Transformar o fluxo atual em uma ficha de avaliação rápida, limpa e segura para uso na sessão, com retorno imediato de resultados, salvamento local automático, sincronização explícita, conclusão controlada, histórico consultável e seleção de conteúdo na exportação do relatório clínico.

## Escopo do pacote

1. Ficha de avaliação em acordeão.
2. Rascunho automático local e sincronização manual.
3. Conclusão de avaliação com validação de sincronização.
4. Edição com adição de testes, sem remoção de resultados históricos.
5. Feedback imediato por cores e resumo de sessão.
6. Histórico cronológico por pessoa, sem comparações entre avaliações.
7. Seleção dos testes que entram no PDF.
8. Validação ponta a ponta do fluxo operacional.

Ficam fora deste pacote: identidade visual de marca, controles de acesso, anamnese, IA, gráficos, comparações entre avaliações e criação de referências clínicas para testes ainda sem parâmetros aprovados.

## 1. Ficha de avaliação

### Estrutura

- A ficha permanece livre: não impõe ordem entre testes selecionados.
- Todos os cartões de teste iniciam recolhidos.
- Ao abrir um cartão, o cartão anteriormente aberto é recolhido.
- Um cartão fechado exibe somente título e faixa/cor de estado; não mostra valores numéricos.
- O cartão aberto contém somente os campos necessários para preenchimento rápido, tentativas e motivo de não conclusão quando aplicável. Não exibirá instruções longas de protocolo.

### Persistência e sincronização

- Cada mudança de campo atualiza imediatamente o rascunho no armazenamento local do aparelho.
- O botão **Salvar** coloca as mudanças na fila e sincroniza com a planilha quando houver conexão.
- O botão **Salvar** não conclui a avaliação.
- Em modo offline, os rascunhos e a fila continuam locais. A interface informa que dados pendentes dependem do armazenamento do navegador e não devem ser removidos antes da sincronização.

### Edição

- Uma avaliação em rascunho ou concluída pode ser reaberta e editada.
- A edição permite adicionar testes selecionados posteriormente à mesma avaliação.
- Testes com dados registrados não podem ser removidos da avaliação, pois permanecem parte do histórico clínico.
- Toda edição atualiza apenas o campo de última atualização; a data original da avaliação é preservada.

### Conclusão

- **Concluir avaliação** é uma ação explícita e separada.
- Fica indisponível enquanto houver dados pendentes de sincronização para a avaliação.
- Só fica disponível quando todo teste selecionado tiver resultado válido ou motivo livre para não conclusão.
- A conclusão ocorre somente após confirmação positiva do servidor.

## 2. Resultado imediato e cores

### Apresentação

- Depois do preenchimento de um teste, o cartão aberto mostra o resultado oficial e uma leitura curta.
- O topo da ficha mostra somente contadores por cor, por exemplo: `2 verdes · 1 amarelo · 3 pendentes`.
- Essa atualização é local e usa apenas os dados já preenchidos na tela; não cria consultas extras à planilha.

### Semântica provisória

| Estado | Significado |
| --- | --- |
| Verde | Dentro ou acima da referência disponível. |
| Amarelo | Abaixo da referência disponível. |
| Vermelho | Reservado a critério clínico específico futuro; não será atribuído automaticamente nesta versão. |
| Cinza | Sem referência aprovada, não iniciado ou não concluído. |

### Regras clínicas deste pacote

- O 2-Minute Step Test usa as faixas já cadastradas: média e acima da média ficam verdes; abaixo da média fica amarelo.
- Back Scratch, Chair Sit-and-Reach, extensão isométrica de joelho e remada isométrica exibem somente medida atual em cinza até referências clínicas serem definidas.
- SPPB permanece um único conjunto. A classificação automática de sentar-levantar continua indisponível até validação clínica específica.
- Não haverá delta, gráfico, comparação com avaliação anterior ou comparação de assimetria neste pacote.
- O motivo de teste não concluído é sempre texto livre.

## 3. Histórico

- O histórico por pessoa é uma linha do tempo cronológica.
- Cada item mostra data da avaliação, profissional responsável, estado e resumo por cores.
- Ao abrir um item, a equipe vê os resultados registrados da avaliação.
- Comparações entre diferentes avaliações não são exibidas nesta versão.
- A equipe compartilha os dados sincronizados pela planilha; a abertura do PWA busca os cadastros compartilhados, preservando os dados locais como contingência offline.

## 4. Relatório PDF

### Seleção

- Antes da geração, o profissional escolhe quais testes entrarão no PDF.
- Testes concluídos começam marcados.
- Testes não concluídos começam desmarcados, mas podem ser incluídos manualmente.
- O documento lista os testes incluídos, evitando que a ausência seja entendida como falha de execução.

### Conteúdo

- Página inicial: resumo simplificado, destinado ao aluno e familiar, com linguagem clara e cores de estado.
- Seção seguinte: detalhamento técnico destinado a profissionais, com resultado oficial, unidade, lado quando aplicável, classificação disponível e motivo de não conclusão quando incluído.
- O relatório mostra a data original da avaliação e a data/hora da última atualização de forma clara.
- As observações do profissional sobre o aluno podem aparecer no relatório.
- Notas sobre os testes são internas e nunca aparecem no PDF.
- O relatório não apresenta diagnóstico e não inclui testes não selecionados como se tivessem falhado.

## 5. Segurança e operação

- Nesta versão não há perfis de usuário nem acesso restrito, conforme decisão anterior.
- A implantação pública atual é temporária e será revista em pacote posterior de segurança.
- Os quatro profissionais fixos permanecem: Elohim, Victor, Lucas e Carlos Eduardo.

## 6. Critérios de aceite

1. Criar pessoa com WhatsApp e confirmar que o cadastro é compartilhado pela planilha.
2. Iniciar avaliação selecionando subconjunto de testes e um profissional fixo.
3. Digitar dados sem conexão, recarregar a página e recuperar o rascunho local.
4. Reconectar, salvar e confirmar a escrita em Avaliacoes, Resultados e Tentativas.
5. Reabrir a mesma avaliação, adicionar SPPB e preservar os resultados anteriores.
6. Registrar teste não concluído com motivo de texto livre e confirmar bloqueio de conclusão quando o motivo estiver vazio.
7. Confirmar que a conclusão só ocorre após sincronização confirmada.
8. Gerar PDF escolhendo subconjunto de testes e confirmar que testes não concluídos só aparecem quando selecionados.
9. Confirmar que notas internas não aparecem no PDF e que observações sobre o aluno aparecem quando preenchidas.

## Decisões registradas

- Fluxo híbrido: ficha rápida + retorno breve imediato.
- Cores são preferidas à apresentação textual neutra, com semântica acessível.
- Sem comparação com avaliações anteriores por enquanto.
- Rascunho local automático; sincronização ao tocar em Salvar.
- Teste com resultados não é removido do histórico.
- Seleção de testes para PDF é obrigatória; não concluídos começam desmarcados.
- Data da avaliação e data/hora de última atualização aparecem no relatório.
- Sem marca e identidade visual neste pacote.
- Histórico em linha do tempo é preferido a tabela técnica inicial.
