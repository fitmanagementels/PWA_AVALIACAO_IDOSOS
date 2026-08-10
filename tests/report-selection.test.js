import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultReportTestIds, reportableResults } from '../web/js/views/report-selection.js';

test('selects concluded tests by default for the report', () => {
  assert.deepEqual(defaultReportTestIds([
    { testeId: 'step-2min', status: 'concluido' },
    { testeId: 'sppb', status: 'naoConcluido' },
    { testeId: 'step-2min', status: 'concluido' }
  ]), ['step-2min']);
});

test('exposes only concluded results to the report selection', () => {
  assert.deepEqual(reportableResults([
    { testeId: 'step-2min', status: 'concluido' },
    { testeId: 'sppb', status: 'naoConcluido' }
  ]).map((result) => result.testeId), ['step-2min']);
});
