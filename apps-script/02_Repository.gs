function spreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Defina a propriedade SPREADSHEET_ID antes de usar o aplicativo');
  return SpreadsheetApp.openById(id);
}

function getRows_(sheetName) {
  const sheet = spreadsheet_().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  return values.slice(1).map(function(row) { return values[0].reduce(function(record, header, index) { record[header] = row[index]; return record; }, {}); });
}

function appendRow_(sheetName, record) {
  const sheet = spreadsheet_().getSheetByName(sheetName);
  const headers = SHEET_HEADERS[sheetName];
  sheet.appendRow(headers.map(function(header) { return record[header] === undefined ? '' : record[header]; }));
}

function updateRowById_(sheetName, idColumn, record) {
  const sheet = spreadsheet_().getSheetByName(sheetName); const headers = SHEET_HEADERS[sheetName];
  const rows = getRows_(sheetName); const index = rows.findIndex(function(row) { return row[idColumn] === record[idColumn]; });
  if (index === -1) return appendRow_(sheetName, record);
  sheet.getRange(index + 2, 1, 1, headers.length).setValues([headers.map(function(header) { return record[header] === undefined ? '' : record[header]; })]);
}

function withLock_(work) { const lock = LockService.getScriptLock(); lock.waitLock(30000); try { return work(); } finally { lock.releaseLock(); } }

function setupSpreadsheet() {
  const book = spreadsheet_();
  Object.keys(SHEET_HEADERS).forEach(function(name) { const sheet = book.getSheetByName(name) || book.insertSheet(name); if (sheet.getLastRow() === 0) sheet.appendRow(SHEET_HEADERS[name]); });
  if (!getRows_(SHEETS.PROFESSIONALS).length) PROFESSIONALS.forEach(function(name) { appendRow_(SHEETS.PROFESSIONALS, { profissionalId: Utilities.getUuid(), nome: name, ativo: true }); });
  return jsonOk_({ sheets: Object.keys(SHEET_HEADERS) });
}
