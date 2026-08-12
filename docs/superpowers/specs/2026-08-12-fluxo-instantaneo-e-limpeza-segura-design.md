# Fluxo instantâneo e limpeza segura — Design

## Objetivo

Remover esperas perceptíveis do fluxo clínico, permitir corrigir a seleção de testes em um rascunho e oferecer uma área segura para eliminar rascunhos já arquivados, sem comprometer a fila local nem a integridade da planilha.

## Decisões aprovadas

- O botão **Concluir avaliação** deve retornar imediatamente à Central de Atendimentos após validação e persistência local. A escrita na planilha ocorre em segundo plano.
- A fila mantém a mutação mais recente de uma mesma avaliação. Uma conclusão substitui o salvamento pendente anterior, evitando que um envio atrasado restabeleça status de rascunho.
- A prévia do PDF volta para a tela anterior somente por navegação local; não pode aguardar API, fila ou atualização de histórico.
- A adição de testes inicia retraída.
- Um teste de uma avaliação em rascunho pode ser removido mediante confirmação. A remoção elimina os resultados e tentativas desse teste, local e remotamente.
- “Não executado” continua sendo a opção clínica quando o teste integrou a sessão, mas não pôde ser realizado.
- Rascunhos arquivados permanecem recuperáveis até uma exclusão permanente confirmada na página de segurança.
- Avaliações concluídas são prontuário: não permitem retirar testes nem apagar dados por esses novos comandos.

## Fluxo diário

1. O profissional abre ou cria uma avaliação e registra dados localmente.
2. Cada alteração importante entra na fila persistente; a interface já apresenta o estado local.
3. Ao concluir, o PWA valida os resultados, troca a mutação pendente da avaliação por `completeAssessment`, grava localmente o status `concluida` e navega imediatamente para a Central.
4. A fila envia o comando quando possível. A interface mostra apenas o estado de sincronização no rodapé.
5. Se o envio falhar, os dados seguem no aparelho e podem ser reenviados sem interromper o atendimento.

## Arquitetura

### Navegação e sincronização

`assessment-editor.js` não chamará `await window.syncNow()` antes de sair da avaliação. Depois de enfileirar uma conclusão, ele atualiza o modelo local, agenda uma sincronização não bloqueante e chama o retorno da Central. A sincronização continua serializada no `mutationQueue`, que já consolida mutações por `assessmentId`.

`report-preview.js` receberá um retorno local predefinido da tela que o abriu. O botão Voltar será ligado antes de qualquer operação de impressão, consulta ou hidratação remota.

### Testes selecionados

Cada cartão de teste do editor terá ação secundária “Retirar”. Ao confirmar:

- o id sai de `assessment.testIds`;
- resultados, tentativas e campos de rascunho daquele teste saem do estado local;
- uma mutação `saveAssessment` consolidada preserva os demais testes;
- o backend remove os resultados e tentativas vinculados somente àquele `avaliacaoId` e `testeId` antes de salvar o estado final.

O bloco `details.add-tests` será renderizado fechado por padrão.

### Arquivo de rascunhos

A Central de Atendimentos terá um ícone discreto de arquivo com contagem, próximo às ações de cabeçalho. A página correspondente busca somente avaliações com status `arquivada`, com pessoa, data, profissional e resumo mínimo.

Cada item oferece **Apagar permanentemente**. A confirmação informa que serão excluídas as linhas da avaliação, resultados, tentativas e resumo histórico associados. A ação só aceita registros `arquivada`; o backend rejeita qualquer outro status.

## API

Novas ações POST:

- `removeAssessmentTest({ avaliacaoId, testeId })`
  - aceita apenas avaliação `rascunho` ou `pendenteDeSincronizacao`;
  - remove o teste do campo `testesSelecionados`, resultados e tentativas correspondentes;
  - atualiza o resumo histórico;
  - retorna a avaliação atualizada.

- `listArchivedDrafts()`
  - retorna avaliações `arquivada`, com identificação da pessoa e metadados mínimos;
  - não retorna resultados/tentativas completos.

- `deleteArchivedAssessment({ avaliacaoId })`
  - aceita somente status `arquivada`;
  - apaga avaliação, resultados, tentativas e resumo histórico associados;
  - retorna o identificador removido.

As operações de exclusão usam `LockService` e identificadores estáveis. Cada resposta segue o contrato `{ ok, data }` ou `{ ok:false, error }`.

## Proteções e recuperação

- A exclusão de teste e a exclusão permanente exigem confirmação explícita no PWA.
- Nenhuma exclusão é disparada até o usuário confirmar; após confirmação, ela entra na fila persistente e a interface já remove o item localmente.
- Se uma exclusão falhar no backend, a fila conserva a mutação e o painel de sincronização expõe a tentativa novamente.
- A remoção de teste não pode concluir uma avaliação sem resultado para os testes que restarem; a validação existente continua sendo aplicada.
- A limpeza de rascunhos arquivados não atua sobre registros concluídos.

## Publicação

O endereço do GitHub Pages não muda. O service worker terá uma nova versão para carregar a interface atualizada. Como há novas ações de backend, após o push do Apps Script será necessário atualizar a **implantação App da Web existente** para uma nova versão; a URL `/exec` atual permanece a mesma.

## Verificação

- Teste automatizado: concluir navega antes de uma promessa de sincronização pendente.
- Teste automatizado: voltar da prévia não executa consulta remota.
- Teste automatizado: retirar teste limpa apenas seus dados e mantém os demais.
- Teste automatizado: backend rejeita remoção em avaliação concluída e exclusão de item não arquivado.
- Teste automatizado: exclusão de rascunho arquivado remove avaliação, resultados, tentativas e resumo.
- Teste manual: com rede lenta ou indisponível, concluir volta imediatamente à Central e mostra envio pendente sem perder dados.
