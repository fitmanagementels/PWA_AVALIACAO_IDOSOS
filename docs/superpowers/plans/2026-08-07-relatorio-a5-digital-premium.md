# Relatório A5 Digital Premium Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Atualizar o protótipo A5 para uma experiência digital premium, sem área editorial estreita, com melhor aproveitamento de tela e sem o rótulo interno “denso”.

**Architecture:** O arquivo HTML de protótipo continua sendo a fonte única de diagramação. A exportação via Chrome headless produz o PDF A5 estático; validações de metadados e renderizações PNG confirmam tamanho, páginas, ausência de cabeçalhos do navegador e legibilidade visual.

**Tech Stack:** HTML, CSS, SVG local da marca XSTEAM, Google Chrome headless, Poppler (`pdftoppm` e `pdfinfo`).

## Global Constraints

- Preservar A5 em retrato, com foco em leitura digital e não em impressão.
- Usar a logo colorida em `web/icons/xsteam-mark.svg`.
- Não exibir “A5 denso” nem outros rótulos internos no relatório.
- Manter data/hora de geração e numeração de página no rodapé.
- Mostrar apenas testes concluídos; notas internas nunca aparecem.
- Não alterar código do PWA, Apps Script ou dados neste pacote.

---

### Task 1: Redesenhar a fonte HTML do protótipo

**Files:**
- Modify: `docs/referencias/prototipos/relatorio-a5-denso.html`

**Interfaces:**
- Consumes: `web/icons/xsteam-mark.svg` como marca colorida.
- Produces: HTML A5 autossuficiente com três seções `.page` e rodapés com a classe `.footer`.

- [x] **Step 1: Substituir a superfície de impressão por uma superfície digital**

Definir a página sem margem externa e garantir que cada seção ocupe a folha:

```css
@page { size: A5 portrait; margin: 0; }
body { background: #e9eeea; }
.page { width: 148mm; height: 210mm; padding: 8mm; background: #f4f7f4; }
```

- [x] **Step 2: Construir o cabeçalho premium da capa**

Manter a logo colorida e aplicar uma barra escura com hierarquia de marca:

```css
.hero { min-height: 35mm; border-radius: 5mm; padding: 5mm; background: linear-gradient(135deg, #06140f, #102c20); }
.hero-logo { width: 12mm; height: 12mm; }
.hero-kicker { color: #dffb45; font-size: 7pt; font-weight: 800; letter-spacing: .13em; }
```

- [x] **Step 3: Distribuir a primeira página verticalmente**

Usar uma grade de dois campos para os seis resultados e permitir que os cartões cresçam dentro do espaço disponível:

```css
.summary-page { display: flex; flex-direction: column; }
.result-grid { display: grid; grid-template-columns: 1fr 1fr; grid-auto-rows: 1fr; gap: 3mm; flex: 1; }
.result { min-height: 28mm; border-radius: 4mm; padding: 3.5mm; }
```

- [x] **Step 4: Atualizar as páginas técnicas e os rodapés**

Aplicar fundo contínuo, cartões mais espaçados, marca d’água única por página técnica e rodapé rastreável:

```css
.technical { background: #eff4f0; }
.technical::before { opacity: .035; background: url('../../../web/icons/xsteam-mark.svg') center / contain no-repeat; }
.footer { color: #60766b; font-size: 6.7pt; }
```

Trocar os textos dos rodapés por `Gerado em 06/08/2026 às 14h35` e `Página N de 3`.

- [x] **Step 5: Verificar a fonte do protótipo**

Run: `grep -n 'A5 denso' docs/referencias/prototipos/relatorio-a5-denso.html`

Expected: nenhuma linha retornada.

### Task 2: Gerar e validar o PDF atualizado

**Files:**
- Modify: `docs/referencias/prototipos/modelo-relatorio-xsteam-a5-denso.pdf`

**Interfaces:**
- Consumes: `docs/referencias/prototipos/relatorio-a5-denso.html`.
- Produces: PDF A5 de três páginas sem cabeçalho/rodapé automático do navegador.

- [x] **Step 1: Gerar o PDF sem elementos do navegador**

Run:

```bash
google-chrome --headless --no-sandbox --disable-gpu --no-pdf-header-footer \
  --print-to-pdf=docs/referencias/prototipos/modelo-relatorio-xsteam-a5-denso.pdf \
  file:///home/elohimlima/Downloads/VSCODE%7CANTIGRAVITY/PWA_AVALIA%C3%87%C3%83O_IDOSOS/docs/referencias/prototipos/relatorio-a5-denso.html
```

Expected: criação do PDF sem texto de URL ou data do navegador.

- [x] **Step 2: Conferir propriedades físicas**

Run: `pdfinfo docs/referencias/prototipos/modelo-relatorio-xsteam-a5-denso.pdf`

Expected: `Pages: 3` e `Page size: 420 x 594.96 pts (A5)`.

- [x] **Step 3: Inspecionar as três páginas renderizadas**

Run:

```bash
pdftoppm -png -r 144 docs/referencias/prototipos/modelo-relatorio-xsteam-a5-denso.pdf /tmp/pwa-relatorio-premium/a5
```

Expected: capa com cabeçalho premium, páginas técnicas com fundo contínuo, nenhum recorte e nenhuma ocorrência de “A5 denso”.

- [x] **Step 4: Registrar o resultado**

Run:

```bash
git add docs/referencias/prototipos/relatorio-a5-denso.html docs/referencias/prototipos/modelo-relatorio-xsteam-a5-denso.pdf docs/superpowers/plans/2026-08-07-relatorio-a5-digital-premium.md
git commit -m "docs: refresh premium digital A5 report prototype"
```

Expected: um commit local contendo apenas os artefatos do protótipo e seu plano.
