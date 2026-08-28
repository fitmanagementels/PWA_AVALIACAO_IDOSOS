import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('oferece exportação única em arquivo sem gravar os dados no Drive', () => {
  const source = readFileSync('apps-script/07_ExportMigration.gs', 'utf8');
  assert.match(source, /function exportMigrationDataDownload\(\)/);
  assert.match(source, /download = 'pwa-avaliacao-export\.json'/);
  assert.match(source, /SpreadsheetApp\.getUi\(\)\.showModalDialog/);
  assert.doesNotMatch(source, /DriveApp\./);
});
