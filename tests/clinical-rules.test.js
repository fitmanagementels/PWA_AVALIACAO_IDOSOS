import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ageOnDate,
  classifyStepTest,
  pickBestAttempt,
  scoreGait4m,
  scoreStaticBalance
} from '../shared/clinical-rules.js';

test('selects the lower time and higher force as required by the test', () => {
  assert.equal(pickBestAttempt([6.2, 5.8], 'lowest'), 5.8);
  assert.equal(pickBestAttempt([20.1, 23.4], 'highest'), 23.4);
});

test('classifies the 2-minute step test by sex and age range', () => {
  assert.equal(classifyStepTest({ sex: 'masculino', age: 60, count: 86 }), 'abaixo da média');
  assert.equal(classifyStepTest({ sex: 'masculino', age: 60, count: 87 }), 'média');
  assert.equal(classifyStepTest({ sex: 'feminino', age: 90, count: 73 }), 'acima da média');
});

test('calculates age at evaluation date', () => {
  assert.equal(ageOnDate('1954-08-02', '2026-08-01'), 71);
});

test('calculates age from ISO datetime values returned by Sheets', () => {
  assert.equal(ageOnDate('1954-02-15T03:00:00.000Z', '2026-08-15T03:00:00.000Z'), 72);
});

test('scores 4m gait without assigning the unresolved 8.70 boundary twice', () => {
  assert.equal(scoreGait4m(4.82), 4);
  assert.equal(scoreGait4m(6.2), 3);
  assert.equal(scoreGait4m(8.7), 2);
  assert.equal(scoreGait4m(8.71), 1);
});

test('scores static balance and identifies inability to attempt', () => {
  assert.equal(scoreStaticBalance({ feetTogether: 10, semiTandem: 10, tandem: 10 }), 4);
  assert.equal(scoreStaticBalance({ feetTogether: 10, semiTandem: 10, tandem: 0 }), 3);
  assert.equal(scoreStaticBalance({ unableToAttempt: true }), 0);
});
