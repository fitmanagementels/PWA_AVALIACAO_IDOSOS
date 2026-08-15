# Cobalto silencioso Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar o acabamento dark premium Cobalto silencioso a todo o PWA sem mudar fluxos, dados, rotas ou sincronização.

**Architecture:** A mudança é concentrada no sistema de design CSS existente. Tokens semânticos no início de `web/styles/app.css` passam a controlar as superfícies azul-obisidiana, texto e bordas; seletores já existentes recebem gradientes internos e estados coerentes. O relatório continua híbrido para leitura/exportação, mas sua moldura e capa recebem a assinatura cobalto; o conteúdo de impressão permanece claro por acessibilidade.

**Tech Stack:** HTML estático, CSS, JavaScript ES modules, Web App Manifest, Service Worker, Node test runner.

## Global Constraints

- Não modificar chamadas de backend, filas de sincronização, rotas, dados clínicos ou estrutura HTML dos fluxos existentes.
- Usar `#E2FF42` somente em marca, CTA primário, foco de teclado e prioridade/métrica.
- Usar quatro superfícies distinguíveis: base `#06080D`, card `#0E131D`, elevada `#192232`, ativa `#2A3850`; overlay `#05070C` e campo `#090E15` complementam o sistema.
- Usar somente `transform` e `opacity` em animações de 180–220 ms e preservar `prefers-reduced-motion`.
- O watermark deve usar `web/icons/xsteam-mark.svg` original, sem `filter`, distorção ou redesenho, somente baixa opacidade e fora das áreas de leitura.
- Manter todos os alvos operacionais em 48px ou mais quando já definidos.
- Após alterar conteúdo cacheado, incrementar a versão do cache em `web/sw.js` e o teste correspondente.

---

## Mapa de arquivos

- `web/styles/app.css`: tokens globais, superfícies operacionais, controles, modais, cards, texturas e watermark.
- `web/styles/report.css`: moldura da prévia e capa do relatório; mantém o documento de impressão claro.
- `web/index.html`: `meta[name="theme-color"]` do navegador/PWA.
- `web/manifest.webmanifest`: cores do shell instalado.
- `web/sw.js`: nova versão de cache para entregar o CSS alterado a instalações existentes.
- `tests/xsteam-theme.test.js`: contrato textual da identidade Cobalto silencioso e de acessibilidade.
- `tests/service-worker.test.js`: versão de cache do shell.

### Task 1: Fixar o contrato automatizado do tema

**Files:**
- Modify: `tests/xsteam-theme.test.js`
- Modify: `tests/service-worker.test.js`

**Interfaces:**
- Consumes: `web/styles/app.css`, `web/index.html`, `web/manifest.webmanifest` e `web/sw.js` como arquivos estáticos.
- Produces: testes que falham até os tokens cobalto, watermark com SVG original, reduced motion, cores de shell e nova versão de cache existirem.

- [ ] **Step 1: Escrever o teste de tema que deve falhar**

  Acrescentar em `tests/xsteam-theme.test.js`:

  ```js
  test('uses cobalto silencioso surfaces and a subtle original brand watermark', () => {
    const css = fs.readFileSync('web/styles/app.css', 'utf8');
    const html = fs.readFileSync('web/index.html', 'utf8');
    const manifest = fs.readFileSync('web/manifest.webmanifest', 'utf8');

    assert.match(css, /--surface-base:\s*#06080D/i);
    assert.match(css, /--surface-card:\s*#0E131D/i);
    assert.match(css, /--surface-elevated:\s*#192232/i);
    assert.match(css, /--surface-active:\s*#2A3850/i);
    assert.match(css, /--surface-overlay:\s*#05070C/i);
    assert.match(css, /--surface-field:\s*#090E15/i);
    assert.match(css, /xsteam-mark\.svg/);
    assert.match(css, /prefers-reduced-motion/);
    assert.match(html, /theme-color" content="#06080D"/i);
    assert.match(manifest, /"background_color": "#06080D"/i);
    assert.match(manifest, /"theme_color": "#06080D"/i);
  });
  ```

  Alterar em `tests/service-worker.test.js`:

  ```js
  assert.match(source, /const CACHE = 'avaliacao-idosos-v31';/);
  ```

- [ ] **Step 2: Executar para confirmar a falha**

  Run: `node --test tests/xsteam-theme.test.js tests/service-worker.test.js`

  Expected: FAIL porque os tokens atuais são verdes e o service worker ainda está em `v30`.

- [ ] **Step 3: Não implementar código nesta tarefa**

  A implementação pertence às Tasks 2–4. Manter os testes vermelhos evita aceitar uma troca parcial de paleta.

- [ ] **Step 4: Confirmar que a falha é somente a esperada**

  Run: `node --test tests/xsteam-theme.test.js tests/service-worker.test.js`

  Expected: falhas por ausência dos tokens/cores Cobalto silencioso e por cache `v30`; não por erro de sintaxe do teste.

- [ ] **Step 5: Preservar a branch funcional antes da implementação**

  Não commitar testes intencionalmente vermelhos. Manter as alterações da Task 1 no worktree e seguir imediatamente para a Task 2; o commit da Task 2 inclui os testes e a implementação verde juntos. Assim, `master` nunca passa a apontar para uma versão que falha na suíte.

### Task 2: Implementar tokens, profundidade de página e marca contextual

**Files:**
- Modify: `web/styles/app.css:1-52`
- Modify: `web/index.html:5-10`
- Modify: `web/manifest.webmanifest:1-8`

**Interfaces:**
- Consumes: contrato de teste da Task 1 e `web/icons/xsteam-mark.svg`.
- Produces: tokens reutilizáveis `--surface-elevated`, `--surface-field`, `--border-subtle` e `--shadow-elevation`, usados pelas Tasks 3 e 4.

- [ ] **Step 1: Atualizar a raiz do tema e o fundo de página**

  Substituir o bloco de tokens inicial de `web/styles/app.css` por:

  ```css
  :root {
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    --surface-base: #06080D;
    --surface-card: #0E131D;
    --surface-elevated: #192232;
    --surface-active: #2A3850;
    --surface-overlay: #05070C;
    --surface-field: #090E15;
    --text-primary: #F3F6F4;
    --text-secondary: #B2C0CD;
    --text-muted: #7E90A4;
    --border: #34425B;
    --border-subtle: #273347;
    --focus: #E2FF42;
    --danger: #FF8D74;
    --success: #9DDC96;
    --warning: #E5BF4B;
    --shadow-elevation: 0 18px 42px #0008;
    color: var(--text-primary);
    background: var(--surface-base);
  }
  body {
    margin: 0;
    min-height: 100vh;
    background:
      radial-gradient(circle at 88% 0, #36527a2e 0, transparent 24rem),
      linear-gradient(180deg, #0B0F17 0%, var(--surface-base) 42rem);
  }
  ```

- [ ] **Step 2: Criar textura e watermark sem afetar conteúdo**

  Adicionar, antes de `.app-header`, os pseudo-elementos abaixo. O `z-index` do header, `main` e dock deve ficar acima de `0`; o pseudo-elemento não recebe eventos.

  ```css
  body::before {
    content: '';
    position: fixed;
    z-index: -1;
    inset: 0;
    pointer-events: none;
    opacity: .16;
    background-image:
      linear-gradient(135deg, transparent 0 49%, #91AFD10D 49.3% 50%, transparent 50.3%);
    background-size: 92px 92px;
    mask-image: linear-gradient(to bottom, #000, transparent 68%);
  }
  body::after {
    content: '';
    position: fixed;
    z-index: -1;
    right: max(-64px, -6vw);
    top: 92px;
    width: min(40vw, 430px);
    height: min(40vw, 430px);
    pointer-events: none;
    opacity: .055;
    background: url('../icons/xsteam-mark.svg') center / contain no-repeat;
  }
  .app-header, main, .sync-dock { position: relative; z-index: 1; }
  ```

- [ ] **Step 3: Aplicar as superfícies globais de primeiro nível**

  Atualizar as regras existentes para usar os tokens:

  ```css
  .app-header { background: color-mix(in srgb, var(--surface-card) 88%, var(--surface-base)); }
  .empty-state, .form-card, .person-card {
    background: linear-gradient(145deg, var(--surface-elevated), var(--surface-card) 62%);
    border-color: var(--border);
    box-shadow: var(--shadow-elevation);
  }
  .form-card input, .form-card select, .form-card textarea,
  .search-field input { background: var(--surface-field); border-color: var(--border); }
  .person-card:hover { background: var(--surface-active); border-color: #516788; }
  ```

- [ ] **Step 4: Atualizar as cores do shell instalado**

  Em `web/index.html` usar:

  ```html
  <meta name="theme-color" content="#06080D">
  ```

  Em `web/manifest.webmanifest` usar:

  ```json
  "background_color": "#06080D",
  "theme_color": "#06080D"
  ```

- [ ] **Step 5: Executar os testes de tema**

  Run: `node --test tests/xsteam-theme.test.js`

  Expected: o teste novo de tokens/shell passa; o teste de service worker continua falhando até a Task 4.

- [ ] **Step 6: Commit dos fundamentos visuais**

  ```bash
  git add web/styles/app.css web/index.html web/manifest.webmanifest tests/xsteam-theme.test.js
  git commit -m "feat: apply cobalto silencioso foundations"
  ```

### Task 3: Aplicar acabamento cobalto aos componentes operacionais

**Files:**
- Modify: `web/styles/app.css:35-117`
- Test: `tests/xsteam-theme.test.js`

**Interfaces:**
- Consumes: tokens da Task 2.
- Produces: componentes operacionais que usam `--surface-field`, `--surface-elevated`, `--surface-active`, `--border-subtle` e feedback sem verde estrutural.

- [ ] **Step 1: Estender o teste para os componentes críticos**

  Adicionar ao teste de Cobalto silencioso:

  ```js
  assert.match(css, /\.xsteam-select__options[\s\S]*var\(--surface-overlay\)/);
  assert.match(css, /\.test-sheet[\s\S]*var\(--surface-card\)/);
  assert.match(css, /\.attendance-card[\s\S]*linear-gradient/);
  assert.match(css, /\.test-summary-card[\s\S]*linear-gradient/);
  assert.match(css, /\.sync-dock[\s\S]*var\(--surface-overlay\)/);
  ```

- [ ] **Step 2: Executar para confirmar a falha**

  Run: `node --test tests/xsteam-theme.test.js`

  Expected: FAIL nas expressões de gradiente de `attendance-card` e `test-summary-card` enquanto ainda usarem superfícies verdes/planas.

- [ ] **Step 3: Substituir hardcodes verdes e aplicar gradientes de baixa amplitude**

  Aplicar estes padrões aos seletores existentes, preservando dimensões e regras de layout:

  ```css
  .selection-card, .attendance-card, .history-entry, .archived-draft {
    background: linear-gradient(145deg, var(--surface-elevated), var(--surface-card) 68%);
    border-color: var(--border);
  }
  .attendance-card__identity:hover, .history-entry:hover,
  .selection-card:hover, .xsteam-select__trigger:hover,
  .xsteam-select__trigger[aria-expanded="true"] {
    background: var(--surface-active);
    border-color: #516788;
  }
  .test-summary-card, .test-card {
    background: linear-gradient(145deg, #161F2D, var(--surface-card) 70%);
    border-color: var(--border);
  }
  .add-tests, .test-sheet__visual, .sync-details {
    background: var(--surface-overlay);
    border-color: var(--border-subtle);
  }
  .test-sheet, .xsteam-select__options {
    background: linear-gradient(145deg, var(--surface-elevated), var(--surface-card) 64%);
    border-color: var(--border);
    box-shadow: var(--shadow-elevation);
  }
  .test-sheet__form input, .compact-number-field__control,
  .toggle-track { background: var(--surface-field); border-color: var(--border); }
  ```

  Atualizar também os hardcodes `#426258`, `#0a1512`, `#0c1714`, `#020705`, `#321a18` e tons neutros verdes nas regras relacionadas, usando `--border`, `--surface-field`, `--surface-overlay`, `--danger` ou tons cobalto equivalentes. Não alterar `--success`, `--warning` e `--danger` para azul.

- [ ] **Step 4: Preservar foco e estados semânticos**

  Garantir explicitamente:

  ```css
  .selection-card:has(input:checked), .selection-card.is-selected {
    background: var(--surface-active);
    border-color: var(--focus);
  }
  .sync-indicator[data-phase="offline"], .sync-indicator[data-phase="pending"] {
    background: var(--warning);
  }
  .test-summary-card__remove:hover {
    color: #fff;
    border-color: var(--danger);
    background: #321A24;
  }
  ```

- [ ] **Step 5: Executar os testes de tema**

  Run: `node --test tests/xsteam-theme.test.js`

  Expected: PASS em todos os testes de tema, incluindo menus, seleção, cards, modal e responsividade.

- [ ] **Step 6: Commit dos componentes operacionais**

  ```bash
  git add web/styles/app.css tests/xsteam-theme.test.js
  git commit -m "feat: refine operational surfaces in cobalto"
  ```

### Task 4: Atualizar prévia de relatório, cache e validar a entrega

**Files:**
- Modify: `web/styles/report.css:1-8`
- Modify: `web/sw.js:1`
- Modify: `tests/service-worker.test.js`

**Interfaces:**
- Consumes: tokens e tema da Task 2; teste de cache da Task 1.
- Produces: prévia integrada ao novo shell, PDF legível e instalações existentes que recebem o novo CSS.

- [ ] **Step 1: Estender o teste de tema para a moldura de relatório**

  Adicionar em `tests/xsteam-theme.test.js`:

  ```js
  const reportCss = fs.readFileSync('web/styles/report.css', 'utf8');
  assert.match(reportCss, /linear-gradient\(125deg, #06080D, #192232\)/);
  assert.match(reportCss, /#E2FF42/);
  ```

- [ ] **Step 2: Executar para confirmar a falha**

  Run: `node --test tests/xsteam-theme.test.js tests/service-worker.test.js`

  Expected: FAIL porque a capa usa o verde anterior e o cache ainda é `v30`.

- [ ] **Step 3: Atualizar a capa de relatório e manter leitura/impressão claras**

  Em `web/styles/report.css`, substituir a regra da capa por:

  ```css
  .report-cover {
    min-height: 102px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 24px clamp(22px, 5vw, 38px);
    color: #F3F6F4;
    background: linear-gradient(125deg, #06080D, #192232);
  }
  ```

  Não alterar `.report-summary`, `.report-technical` e as regras `@media print`: a página clara é um documento de leitura/exportação e não a superfície operacional do PWA.

- [ ] **Step 4: Forçar a renovação do shell cacheado**

  Em `web/sw.js`, usar:

  ```js
  const CACHE = 'avaliacao-idosos-v31';
  ```

- [ ] **Step 5: Rodar testes completos e verificações estáticas**

  Run: `node --test tests/xsteam-theme.test.js tests/service-worker.test.js && npm test && git diff --check`

  Expected: todos os testes passam, inclusive cache `v31`; nenhum espaço inválido é reportado.

- [ ] **Step 6: Verificar manualmente em desktop e mobile**

  Run: `node scripts/build-preview.js`

  Expected: preview local gerado. Conferir em viewport desktop e mobile:

  - fundo cobalto sem verde estrutural dominante;
  - marca original discreta e fora de texto/dados;
  - cards com gradiente legível e bordas frias;
  - CTA/foco em lime, erro/sucesso/alerta semanticamente distintos;
  - select mobile, modal de teste, dock e prévia de relatório sem overflow;
  - modo reduced motion sem animações decorativas.

- [ ] **Step 7: Commit da entrega visual**

  ```bash
  git add web/styles/report.css web/sw.js tests/xsteam-theme.test.js tests/service-worker.test.js
  git commit -m "feat: finish cobalto silencioso PWA theme"
  ```
