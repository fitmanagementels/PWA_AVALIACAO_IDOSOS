import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAssessmentStart, whatsAppUrl } from '../web/js/domain.js';

test('creates a WhatsApp link only for a normalized number', () => {
  assert.equal(whatsAppUrl('5585999999999'), 'https://wa.me/5585999999999');
  assert.equal(whatsAppUrl(''), null);
});

test('starts an assessment with selected tests and a fixed professional', () => {
  assert.deepEqual(buildAssessmentStart({
    personId: 'p1',
    professionalName: 'Elohim',
    testIds: ['sppb', 'step-2min']
  }), {
    personId: 'p1',
    professionalName: 'Elohim',
    testIds: ['sppb', 'step-2min']
  });
});
