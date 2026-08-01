# Implantação

## Pré-requisitos

- Uma planilha Google exclusiva para a base de dados.
- Uma conta Google que possa criar e publicar o projeto Apps Script.
- Node.js 18 ou superior para executar os testes locais.

## Apps Script

1. No diretório do projeto, execute `npx @google/clasp create --type webapp --title "PWA Avaliação Idosos"`.
2. Mantenha o `.clasp.json` gerado apenas na máquina local; ele é ignorado pelo Git.
3. Como o projeto foi criado vinculado à planilha, não é necessário definir `SPREADSHEET_ID`.
4. No editor Apps Script, execute a função `setupSpreadsheet()` uma vez para criar as abas e os profissionais iniciais.
5. Em **Implantar > Nova implantação > Aplicativo da Web**, escolha executar como sua conta, selecione o acesso definido pela equipe e copie a URL terminada em `/exec`.
6. Cole essa URL em `web/config.js` como valor de `window.APP_API_URL`, execute `git commit` e envie para o GitHub.

## GitHub Pages

1. Crie um repositório GitHub vazio e adicione-o como `origin`.
2. Envie a branch `master`.
3. Em **Settings > Pages**, escolha **GitHub Actions** como fonte.
4. O workflow `.github/workflows/deploy-pages.yml` publica automaticamente a pasta `web/` a cada push na `master`.

## Verificação local

Execute `npm test`. A saída deve terminar com zero falhas.
