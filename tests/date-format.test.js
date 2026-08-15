import assert from 'node:assert/strict';
import test from 'node:test';
import { ageInYears, formatDateBr, formatDateTimeBr } from '../web/js/date-format.js';

test('formats ISO clinical dates without a timezone day shift', () => {
  assert.equal(formatDateBr('1999-05-29T03:00:00.000Z'), '29/05/1999');
  assert.equal(formatDateBr('1950-01-01'), '01/01/1950');
});

test('formats event timestamps in common Brazilian notation', () => {
  assert.equal(formatDateTimeBr('2026-08-04T17:05:00.000Z'), '04/08/2026 às 14:05');
});

test('calculates the current age from a date-only birth date', () => {
  assert.equal(ageInYears('1954-08-15', new Date('2026-08-15T12:00:00Z')), 72);
  assert.equal(ageInYears('1954-08-16', new Date('2026-08-15T12:00:00Z')), 71);
  assert.equal(ageInYears('1954-08-16', new Date('2026-08-16T01:00:00Z')), 71);
  assert.equal(ageInYears('', new Date('2026-08-15T12:00:00Z')), null);
});
