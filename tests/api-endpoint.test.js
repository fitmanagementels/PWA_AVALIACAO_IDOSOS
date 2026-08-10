import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('uses the active Google-account Web App endpoint', () => {
  const source = fs.readFileSync('web/config.js', 'utf8');
  assert.match(source, /AKfycby90CjCB6Y-I6ixrbBbLZtm0oTw2_cpjzTOzYSwXC-tFyAmU9OHuizhKxGiV0Yxdnx8gw/);
});
