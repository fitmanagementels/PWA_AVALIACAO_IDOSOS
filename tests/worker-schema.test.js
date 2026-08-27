import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readMigration = (name) => readFileSync(`worker/migrations/${name}`, 'utf8');

test('declara relações, resultado por lado e índices do histórico', () => {
  const sql = readMigration('0001_initial.sql');

  assert.match(sql, /CREATE TABLE IF NOT EXISTS people/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS assessments/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS assessment_tests/);
  assert.match(sql, /UNIQUE\(assessment_id, test_id, side\)/);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS assessments_person_date_idx/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS migration_audit/);
});

test('semeia os quatro profissionais e os seis testes selecionáveis atuais', () => {
  const sql = readMigration('0002_seed_catalog.sql');

  for (const professionalId of ['professional-elohim', 'professional-victor', 'professional-lucas', 'professional-carlos-eduardo']) {
    assert.match(sql, new RegExp(professionalId));
  }

  for (const testId of ['back-scratch', 'chair-sit-reach', 'sppb', 'step-2min', 'knee-extension-isometric', 'rowing-isometric']) {
    assert.match(sql, new RegExp(testId));
  }

  assert.match(sql, /ON CONFLICT\(id\) DO UPDATE/);
});
