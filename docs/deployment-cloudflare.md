# Publicação Cloudflare — PWA Avaliação Idosos

O Worker `pwa-avaliacao-idosos-api` e o D1 `pwa-avaliacao-idosos` já existem. Eles passam a ser o backend operacional somente após a importação validada e a troca de `APP_BACKEND` no PWA. Apps Script e Google Sheets permanecem intactos como backup até o encerramento do período de observação.

## Ordem segura de publicação

1. Confirme autenticação Cloudflare com `npx wrangler@3.114.10 whoami`.
2. Aplique o schema antes do Worker:

```bash
npx wrangler@3.114.10 d1 migrations apply pwa-avaliacao-idosos --remote --config worker/wrangler.jsonc
```

3. Exporte a planilha usando `exportMigrationData()` no Apps Script. Salve o JSON fora do repositório.
4. Faça a conferência sem escrita:

```bash
node scripts/import-d1.mjs --input /caminho/seguro/exportacao.json --dry-run
```

5. Somente com o checksum exibido no dry-run, importe:

```bash
node scripts/import-d1.mjs --input /caminho/seguro/exportacao.json --remote --approved-checksum '<checksum>'
```

6. Configure o Google OAuth Web Client com a origem `https://pwa-avaliacao-idosos.pages.dev`. O Client ID público deve existir tanto em `worker/wrangler.jsonc` quanto em `web/config.js`.
7. Defina a lista de e-mails autorizados exclusivamente como secret; nunca a grave em arquivo, commit ou mensagem de log:

```bash
npx wrangler@3.114.10 secret put AUTHORIZED_EMAILS --config worker/wrangler.jsonc
```

Com o Wrangler instalado localmente, o mesmo comando é `wrangler secret put AUTHORIZED_EMAILS --config worker/wrangler.jsonc`.

8. Publique Worker e Pages:

```bash
npx wrangler@3.114.10 deploy --config worker/wrangler.jsonc
npx wrangler@3.114.10 pages deploy web --project-name pwa-avaliacao-idosos --branch main
```

## Validação

`/health` do Worker deve retornar 200 sem dados clínicos. `/api/people`, sem Bearer token, deve retornar 401. Após login com uma conta autorizada, valide cadastro, abertura e edição de avaliação, tentativas, histórico, relatório, rascunho offline e sincronização.

## Rollback

Não exclua D1 ou Sheets. Para retornar temporariamente, restaure o `web/config.js` para `APP_BACKEND = 'apps-script'` e a URL anterior, então republique Pages. Os dados da planilha permanecem sem modificação.
