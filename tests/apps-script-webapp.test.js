import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('serves the operational HTML shell when the Web App has no API action', () => {
  const source = fs.readFileSync('apps-script/01_WebApp.gs', 'utf8');
  assert.match(source, /if \(!action\) return operationalApp_\(\);/);
  assert.match(source, /HtmlService\.createHtmlOutputFromFile\('08_OperationalApp'\)/);
});

test('does not register the static PWA service worker inside Apps Script', () => {
  const source = fs.readFileSync('web/js/app.js', 'utf8');
  assert.match(source, /window\.APP_RUNTIME !== 'apps-script'/);
});
