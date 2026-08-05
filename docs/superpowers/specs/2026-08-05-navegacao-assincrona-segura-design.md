# Navegação assíncrona segura

## Objetivo

Impedir que respostas de rede tardias substituam a tela escolhida mais recentemente pelo profissional, sem descartar os dados que possam ser reutilizados em cache.

## Causa

As telas de histórico e de detalhes iniciam requisições assíncronas e, ao receber a resposta, escrevem diretamente no elemento raiz. Se o usuário navegar antes da resposta terminar, a requisição antiga ainda renderiza sua própria tela sobre a navegação mais nova.

## Decisão

Usar um selo global de navegação. Cada transição de tela cria um identificador novo. Uma tarefa assíncrona captura o identificador criado para sua tela e, quando termina, só pode alterar a interface se o identificador ainda for o atual.

As tarefas continuam concluindo normalmente: respostas de histórico podem atualizar o cache local e respostas de avaliação podem ser preservadas para uso posterior. O bloqueio se aplica somente à renderização ou à alteração de mensagens na tela que já não está visível.

## Componentes

- `web/js/navigation-guard.js`: mantém o identificador atual e expõe `startNavigation()` e `isCurrentNavigation(token)`.
- `web/js/views/people.js`: inicia uma navegação em cada renderização de página e protege atualizações após `getHistorySummary` e `getAssessment`.
- `tests/navigation-guard.test.js`: cobre a invalidação de uma navegação anterior.
- `tests/people-history.test.js`: confirma que as respostas assíncronas do histórico e dos detalhes passam pelo controle de navegação.

## Fluxo

1. O usuário abre Histórico; a tela recebe o selo A e inicia a leitura remota.
2. O usuário abre uma avaliação; a tela recebe o selo B e inicia a leitura de detalhes.
3. O usuário volta ao Histórico; a tela recebe o selo C.
4. Se as respostas de A ou B terminarem depois, elas podem salvar cache, mas não podem renderizar porque A e B não são mais atuais.
5. Apenas respostas iniciadas pela tela C poderão atualizar a tela C.

## Critérios de aceite

- Navegar rapidamente para trás ou para outra ação não é revertido por uma resposta tardia.
- O cache de histórico continua sendo atualizado quando a resposta for válida, mesmo que a tela tenha mudado.
- Erros de uma requisição abandonada não substituem a mensagem da tela atual.
- O comportamento não exige cancelar a requisição e não altera o protocolo da API.
