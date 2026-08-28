/**
 * Exportação única, somente leitura, para a migração Sheets -> Cloudflare D1.
 * Execute manualmente no editor Apps Script e salve o JSON fora do repositório.
 */
function exportMigrationData() {
  const names = ['Pessoas', 'Profissionais', 'Avaliacoes', 'Resultados', 'Tentativas', 'CatalogoTestes', 'Referencias', 'Protocolos', 'HistoricoResumo'];
  const sheets = names.reduce(function(result, name) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
    const values = sheet ? sheet.getDataRange().getValues() : [];
    const headers = values[0] || [];
    result[name] = values.slice(1).map(function(row) {
      return headers.reduce(function(record, header, index) {
        const value = row[index];
        record[header] = value instanceof Date ? value.toISOString() : value;
        return record;
      }, {});
    });
    return result;
  }, {});
  return JSON.stringify({
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    sheets: sheets,
    counts: Object.fromEntries(Object.entries(sheets).map(function(entry) { return [entry[0], entry[1].length]; }))
  });
}

/**
 * Abre uma janela de download local no navegador. O arquivo é gerado em memória
 * e não é salvo no Google Drive, na planilha ou no repositório.
 */
function exportMigrationDataDownload() {
  const json = exportMigrationData();
  const jsonLiteral = JSON.stringify(json)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
  const html = `<!doctype html>
<html lang="pt-BR">
  <head><base target="_top"></head>
  <body style="font-family:Arial,sans-serif;padding:16px;color:#102820">
    <p style="margin:0 0 14px">A exportação está pronta. Baixe o arquivo e envie-o nesta conversa.</p>
    <a id="download" style="display:inline-block;background:#1a7f55;color:#fff;padding:10px 14px;border-radius:6px;text-decoration:none;font-weight:700">Baixar pwa-avaliacao-export.json</a>
    <script>
      const json = ${jsonLiteral};
      const link = document.getElementById('download');
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      link.href = url;
      link.download = 'pwa-avaliacao-export.json';
    </script>
  </body>
</html>`;
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(470).setHeight(170),
    'Exportar dados para migração'
  );
}
