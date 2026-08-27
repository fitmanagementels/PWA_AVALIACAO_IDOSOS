# Migração para Cloudflare Free — desenho técnico aprovado

## Objetivo

Substituir a operação baseada em Google Apps Script, Google Sheets e Google Drive por uma arquitetura gratuita em Cloudflare, preservando todas as funcionalidades existentes do PWA XSTEAM de avaliações funcionais.

## Decisões aprovadas

- O PWA estático continuará em `web/`, será publicado no Cloudflare Pages e permanecerá instalável, responsivo e funcional em celular.
- Um Cloudflare Worker será a única API operacional. Todas as rotas sob `/api/` exigirão autenticação Google válida e e-mail autorizado.
- Cloudflare D1 será a única base compartilhada de leitura e escrita após o corte.
- Google Sheets e Apps Script serão utilizados apenas como origem única da importação e como backup não operacional. Eles não serão apagados durante esta migração.
- O PDF continuará sendo montado no navegador pela prévia HTML existente e salvo/compartilhado pela função nativa de impressão. Não haverá Google Drive, armazenamento de PDF ou serviço pago.
- IndexedDB e `localStorage` continuam responsáveis por rascunhos, fila de mutações, cache de histórico e filtros locais. O service worker armazenará somente recursos estáticos, nunca API nem dados pessoais.

## Arquitetura alvo

```text
Browser / PWA (Cloudflare Pages)
  ├─ arquivos estáticos em web/
  ├─ Google Identity Services
  ├─ IndexedDB: rascunhos e fila offline
  ├─ localStorage: pessoas e histórico recente
  └─ fetch autenticado
          │ Authorization: Bearer <Google ID token>
          ▼
Cloudflare Worker
  ├─ CORS restrito ao domínio Pages
  ├─ valida JWT Google (assinatura, iss, aud, exp, email_verified)
  ├─ valida e-mail em AUTHORIZED_EMAILS (segredo do Worker)
  ├─ aplica regras clínicas e de integridade
  └─ Cloudflare D1
       ├─ dados clínicos e operacionais
       ├─ catálogo, protocolos e referências versionadas
       └─ auditoria da importação única
```

O Google OAuth Client ID é configuração pública necessária ao navegador e será configurado em `web/config.js`. Não é segredo. A lista de e-mails autorizados será definida exclusivamente por `wrangler secret put AUTHORIZED_EMAILS`; ela nunca será gravada em Git, D1, HTML ou arquivos públicos.

## Limites e segurança

- Apenas Workers Free, D1 Free e Pages Free serão usados.
- A API responderá com `Cache-Control: no-store`.
- O Worker aceitará CORS somente da origem exata do Pages; `OPTIONS` será tratado antes da autenticação.
- Um endpoint público não será exposto sob `/api/`. Caso seja necessário diagnóstico de infraestrutura, ele ficará em `/health` e retornará somente estado técnico, sem dados ou identidade.
- O Worker verificará Google ID tokens por JWKs do Google armazenados temporariamente no cache do Worker. O token será validado por assinatura `RS256`, emissor, audiência, validade temporal, `email_verified`, `sub` e e-mail autorizado.
- O service worker terá estratégia app-shell para requisições `GET` do mesmo domínio e da lista explícita de assets. Requisições a `/api/`, domínios externos e qualquer conteúdo pessoal serão sempre ignoradas.

## Modelo D1

Todos os IDs existentes do Sheets serão preservados como `TEXT` para manter relações e referências de rascunhos locais.

### Tabelas de domínio

| Tabela | Responsabilidade |
| --- | --- |
| `people` | Pessoa avaliada: nome, nascimento, sexo, WhatsApp, status e criação. |
| `professionals` | Lista fixa inicial de profissionais ativos. |
| `assessments` | Cabeçalho da sessão: pessoa, data, profissional, status, notas internas, observações exportáveis e timestamps. |
| `assessment_tests` | Testes selecionados e sua ordem dentro de uma avaliação. |
| `results` | Resultado oficial por teste/lado, status, unidade, motivo, versão de protocolo e referência aplicada imutável. |
| `attempts` | Tentativas ordenadas, valores, lado, unidade e validade. |
| `catalog_tests` | Catálogo configurável de testes e definição JSON do formulário. |
| `references` | Referências clínicas versionadas, critérios JSON, classificação e vigência. |
| `protocols` | Protocolos versionados por teste. |
| `migration_audit` | Origem, contagens, data e checksum da importação; sem substituir dados clínicos. |

`HistoricoResumo` não será uma tabela operacional no D1. Ele é derivado de avaliações, testes selecionados e resultados. O Worker produzirá esse resumo por consulta indexada; o PWA conservará o cache local por pessoa para abertura imediata e filtragem em memória.

Índices obrigatórios incluem: avaliações por pessoa/data/status, testes por avaliação/ordem, resultados por avaliação/teste/lado, tentativas por resultado/ordem e referências por teste/vigência/versão.

## Compatibilidade de regras de negócio

O Worker preservará as regras atuais antes de qualquer aprimoramento clínico:

- profissionais fixos: Elohim, Victor, Lucas e Carlos Eduardo;
- uma avaliação contém apenas os testes selecionados;
- uma pessoa tem no máximo um rascunho operacional por vez;
- conclusão exige resultado ou motivo de não conclusão para cada teste selecionado;
- conclusão arquiva outros rascunhos ativos da mesma pessoa;
- resultados bilaterais preservam tentativas e valor oficial por lado;
- testes de força escolhem o maior valor por lado;
- testes em que tempo é o critério usam o menor valor quando a configuração do teste assim determinar;
- SPPB continua como conjunto único;
- notas sobre testes são internas; observações sobre a pessoa podem aparecer no relatório;
- referências usam sexo e idade na data da avaliação quando o critério exigir;
- uma referência aplicada guarda seu snapshot e não é substituída quando a tabela de referência mudar;
- resultados sem referência continuam objetivos e não exibem aviso de ausência.

## API proposta

Todas as respostas seguem `{ ok, data, meta }` ou `{ ok: false, error: { code, message } }` e são autenticadas.

| Método e rota | Contrato preservado |
| --- | --- |
| `GET /api/people` | Lista pessoas ativas e fluxo resumido. |
| `POST /api/people` | Cria pessoa com ID cliente preservado. |
| `GET /api/people/:id` | Lê uma pessoa. |
| `PATCH /api/people/:id` | Atualiza dados cadastrais. |
| `GET /api/people/:id/flow` | Rascunho ativo e última concluída. |
| `GET /api/people/:id/history` | Histórico resumido e filtrável no cliente. |
| `GET /api/assessments?status=arquivada` | Lista rascunhos arquivados. |
| `POST /api/assessments` | Cria rascunho. |
| `GET /api/assessments/:id` | Retorna avaliação, resultados e tentativas. |
| `PUT /api/assessments/:id` | Salva rascunho e resultados idempotentemente. |
| `POST /api/assessments/:id/complete` | Salva e conclui avaliação. |
| `POST /api/assessments/:id/archive` | Arquiva rascunho permitido. |
| `DELETE /api/assessments/:id` | Exclui permanentemente apenas rascunho arquivado. |
| `DELETE /api/assessments/:id/tests/:testId` | Remove teste de rascunho e seus dados. |
| `GET /api/catalog` | Catálogo, protocolos e referências necessárias para a UI. |

O adaptador do frontend converterá o modelo atual de ações para essas rotas. As telas, campos e comportamento local continuarão os mesmos durante a migração.

## Importação e corte

1. Exportar cada aba atual como JSON/CSV de leitura única, sem apagar ou editar Sheets.
2. Validar cabeçalhos e normalizar datas para `YYYY-MM-DD` ou ISO UTC, preservando JSONs de critérios e snapshots de referência sem reinterpretá-los.
3. Executar um importador em modo `dry-run`: contagens, duplicidades de ID, chaves estrangeiras inválidas, JSON inválido e total por tabela.
4. Aplicar migrations em D1 remoto, importar em lotes idempotentes e gravar `migration_audit`.
5. Comparar contagens e amostrar avaliações completas, tentativas, referências e relatórios contra a origem.
6. Publicar Worker e Pages, configurar CORS, Google Client ID, OAuth JavaScript origin e segredo de e-mails.
7. Alterar `web/config.js` somente após homologação com D1; manter Apps Script/Sheets intactos como rollback manual até aprovação do corte.

## Testes e aceitação

Antes de cada funcionalidade crítica será escrito um teste que falha. A migração acrescentará testes para:

- validação de token Google, audiência, expiração, emissor e e-mail permitido;
- bloqueio de todas as rotas `/api/` sem token;
- CORS de origem permitida e negada;
- repositório D1 e integridade de relações;
- salvamento idempotente de avaliação, resultados e tentativas;
- referência por sexo/idade e preservação de snapshot;
- rascunho único, arquivamento e exclusão protegida;
- importação com datas, IDs e contagens preservadas;
- cliente autenticado, fila offline e ausência de cache da API;
- fluxo manual em celular: login, cadastro, rascunho offline, retorno online, edição, complemento, conclusão, histórico e PDF.

O corte é aceito somente quando `npm test` estiver totalmente verde, migrations tiverem sido aplicadas, importação tiver relatório sem divergência e o PWA de produção tiver sido testado com um e-mail autorizado.

## Fora do escopo desta migração

- Novo desenho visual, nova anamnese, IA, novos testes ou novas referências clínicas.
- Papéis internos distintos ou tela de gestão de usuários.
- Geração de PDF no servidor ou armazenamento de arquivos.
- Exclusão de Apps Script, Google Sheets ou Google Drive históricos.
