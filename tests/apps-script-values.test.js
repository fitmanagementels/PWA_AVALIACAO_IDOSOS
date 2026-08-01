import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

function backendHelper(name) {
  const source = fs.readdirSync('apps-script')
    .filter((file) => file.endsWith('.gs'))
    .map((file) => fs.readFileSync(`apps-script/${file}`, 'utf8'))
    .join('\n');
  return new Function(`${source}\nreturn ${name};`)();
}

test('keeps zero as a valid official result sent to Sheets', () => {
  const fieldOrBlank = backendHelper('fieldOrBlank_');
  assert.equal(fieldOrBlank(0), 0);
  assert.equal(fieldOrBlank(null), '');
});
