import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('gera arquivo temporário de exportação para projeto Apps Script independente da planilha', () => {
  const source = readFileSync('apps-script/07_ExportMigration.gs', 'utf8');
  assert.match(source, /function exportMigrationDataToTemporaryFile\(\)/);
  assert.match(source, /DriveApp\.createFile\('pwa-avaliacao-export\.json', exportMigrationData\(\), MimeType\.JSON\)/);
  assert.doesNotMatch(source, /SpreadsheetApp\.getUi\(\)/);
});
