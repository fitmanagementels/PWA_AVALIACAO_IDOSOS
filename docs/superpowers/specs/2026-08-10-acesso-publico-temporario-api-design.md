# Acesso da Web App por conta Google — desenho

## Objetivo

Permitir que o PWA hospedado no GitHub Pages sincronize com o Apps Script durante a fase de desenvolvimento, usando a sessão Google já aberta no navegador e mantendo a planilha privada.

## Decisão

A implantação adequada é uma **App da Web**, executando como o proprietário e disponível para **Qualquer pessoa com uma Conta do Google**. O PWA usa o endereço `/exec` desta Web App e envia `credentials: 'include'` em cada chamada para levar a sessão Google existente.

O Executável da API não é uma Web App e não pode ser usado pela URL `/exec`; ele não deve ser configurado em `web/config.js`.

## Canal operacional

A Web App abre uma casca HTML pequena que carrega os mesmos estilos e módulos publicados no GitHub Pages. Nesse contexto, o cliente detecta `window.APP_RUNTIME === 'apps-script'` e usa `google.script.run` para chamar as funções do Apps Script diretamente, sem `fetch` entre domínios. O GitHub Pages continua sendo a fonte de arquivos visuais e o preview instalável, mas a URL operacional de testes passa a ser a Web App.

## Fluxo

1. O PWA continua salvando cada ação imediatamente na fila local.
2. Na URL operacional, a fila envia as ações com `google.script.run`, dentro da sessão Google que abriu a Web App.
3. O Apps Script grava as alterações na planilha e devolve a confirmação.
4. Caso a sessão Google esteja ausente ou a API não responda, a ação não é descartada: permanece localmente pendente e pode ser reenviada depois.

## Escopo e limites

- Publicação de código no GitHub Pages continua independente da permissão do Apps Script: atualizações visuais e de código do PWA podem ser feitas normalmente. A casca da Web App carrega esses mesmos arquivos na próxima abertura.
- A planilha não é pública e o Apps Script exige uma conta Google. Os testes continuam usando dados não sensíveis até que a autorização por e-mail seja implementada.
- Antes do uso operacional, a autorização por e-mail será adicionada ao backend; a Web App continua a ser o canal de transporte.

## Verificação

- A raiz da URL `/exec` deve abrir a interface operacional, sem uma tela adicional de login além da sessão Google do navegador.
- O PWA operacional deve conseguir sincronizar as alterações pendentes e refletir o resultado na planilha.
- A fila local deve sobreviver caso a API esteja temporariamente indisponível.
