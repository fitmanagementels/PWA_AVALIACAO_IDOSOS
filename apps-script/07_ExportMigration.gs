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
