# Contexto operacional — PWA Avaliação Funcional XSTEAM

> Documento de referência para continuidade do projeto. Atualizado em 15/08/2026. O código em `master` é a fonte de verdade quando houver divergência.

## Propósito

PWA para registrar, guardar, consultar e apresentar avaliações funcionais de pessoas idosas atendidas pela XSTEAM. A aplicação é compartilhada inicialmente por Elohim, Victor, Lucas e Carlos Eduardo, sem perfis internos de acesso nesta fase.

O produto prioriza preenchimento rápido em celular ou tablet, preservação local antes do envio e leitura clara de resultados para a pessoa avaliada, familiares e profissionais.

## Arquitetura atual

| Camada | Responsabilidade |
| --- | --- |
| `web/` | PWA estática em HTML, CSS e JavaScript modular; interface, rascunhos locais, fila de sincronização e prévia do relatório. |
| GitHub Pages | Publica automaticamente a pasta `web/` a cada push para `master`. |
| `apps-script/` | API JSON no Google Apps Script; valida e grava dados, gera dados para relatório e protege escritas com `LockService`. |
| Google Sheets | Base central com pessoas, avaliações, resultados, tentativas, referências, protocolos e resumo de histórico. |
| IndexedDB e `localStorage` | Mantêm rascunhos e operações pendentes neste dispositivo até a sincronização ser confirmada. |

O endereço público do Apps Script é configurado somente em `web/config.js`. Não registrar URLs antigas em documentação operacional.

## Fluxo de trabalho

1. Cadastrar ou localizar a pessoa avaliada.
2. Iniciar uma avaliação e selecionar apenas os testes que serão aplicados naquela sessão.
3. Registrar cada teste na ficha rápida. As tentativas são salvas no aparelho durante o preenchimento.
4. Salvar e sincronizar ou concluir a avaliação. Sem conexão, a alteração permanece pendente neste dispositivo e será reenviada quando possível.
5. Retomar uma avaliação em rascunho para editar tentativas já registradas ou complementar com testes adicionais disponíveis no catálogo.
6. Consultar o histórico da pessoa e selecionar os testes concluídos que aparecerão no relatório em PDF.

Uma avaliação representa uma sessão, ainda que precise ser retomada em outro momento. A data original e a última atualização são preservadas. Não há trilha de auditoria por edição individual.

## Dados e regras relevantes

- Cadastro atual: nome completo, data de nascimento, sexo e WhatsApp. Informações diagnósticas permanecem fora do escopo até o módulo de anamnese.
- Avaliação: responsável, testes selecionados, status, notas internas e observações sobre o aluno.
- **Notas sobre os testes** são internas e não entram no relatório.
- **Observações do profissional sobre o aluno** aparecem no relatório somente quando preenchidas.
- Resultado: valor oficial, unidade, lado quando aplicável, classificação quando existir referência e tentativas ordenadas.
- Resultado oficial é o melhor valor conforme o teste; cada tentativa bruta continua armazenada para revisão.
- Teste não concluído exige motivo e não recebe classificação numérica.
- A PWA não deve produzir diagnóstico, prescrição ou interpretação clínica sem regra validada.

## Catálogo inicial

| Grupo | Testes disponíveis |
| --- | --- |
| Flexibilidade | Back Scratch; Chair Sit-and-Reach |
| Mobilidade e equilíbrio | SPPB como conjunto único: caminhada de 4 m, sentar e levantar 5x e equilíbrio |
| Capacidade cardiorrespiratória | 2-Minute Step Test |
| Força isométrica máxima | Extensão de joelho unilateral; remada unilateral, ambas em kgf com dinamômetro de tensão |

Referências e classificações precisam ser aplicadas apenas quando estiverem configuradas e validadas no projeto. Resultados de força permanecem medidas objetivas até haver referência clínica aprovada.

## Relatório em PDF

O PDF atual segue o modelo digital A5, com uma leitura em duas camadas:

1. Abertura breve e intuitiva: identificação, resultados realizados, rótulos de classificação quando houver e observações do profissional.
2. Detalhamento técnico: somente testes concluídos escolhidos para aquele relatório, valores oficiais, lados, tentativas quando pertinentes e informação de referência/classificação disponível.

O relatório não exibe testes não realizados. Ele é uma apresentação da sessão registrada e não substitui avaliação médica. O modelo vivo está em [MODELO-RELATORIO-EM-EVOLUCAO.md](referencias/MODELO-RELATORIO-EM-EVOLUCAO.md).

## Sincronização e proteção contra perda

- A interface salva primeiro no dispositivo e só depois tenta a rede, evitando bloquear o profissional durante chamadas lentas ao Apps Script.
- Existe uma fila persistente de mutações por avaliação; uma nova alteração da mesma avaliação substitui a operação pendente anterior pelo estado mais recente.
- O indicador inferior informa se está sincronizado, enviando, offline ou com falha recuperável.
- O dado fica protegido no dispositivo enquanto os dados da PWA/navegador não forem apagados. Limpar dados do navegador, desinstalar a PWA ou trocar de aparelho pode remover rascunhos ainda não sincronizados.
- Depois de sincronizado, o Google Sheets é a base compartilhada e durável da equipe.

## Operação e manutenção

- Executar `npm test` antes de publicar alterações. A suíte cobre regras de domínio, sincronização, telas e relatório.
- Um push para `master` aciona o deploy do GitHub Pages. O service worker deve receber uma nova versão de cache quando arquivos do PWA forem alterados.
- Alterações em `apps-script/` exigem envio e implantação separados no Apps Script; confirmar a URL pública `/exec` antes de atualizar `web/config.js`.
- A configuração da planilha e da implantação está em [deployment.md](deployment.md).
- Estrutura clínica e decisões históricas estão em [ESTRUTURA-DO-PROJETO-EM-EVOLUCAO.md](referencias/ESTRUTURA-DO-PROJETO-EM-EVOLUCAO.md).

## Próximas evoluções previstas

- Corrigir e prevenir tentativas duplicadas na base e na leitura do PDF.
- Completar referências e protocolos validados para os demais testes.
- Evoluir anamnese e informações exploratórias em módulo separado.
- Integrar Gemma/Gemini Lite para sugestões de insights, sem substituir regras determinísticas nem julgamento profissional.
- Definir controles de acesso antes de ampliar o compartilhamento de dados clínicos.
