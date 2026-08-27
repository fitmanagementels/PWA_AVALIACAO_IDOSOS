PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  birth_date TEXT NOT NULL,
  sex TEXT NOT NULL CHECK (sex IN ('masculino', 'feminino')),
  whatsapp TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'arquivado')),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS professionals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);

CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(id),
  assessment_date TEXT NOT NULL,
  professional_id TEXT NOT NULL REFERENCES professionals(id),
  status TEXT NOT NULL CHECK (status IN ('rascunho', 'pendenteDeSincronizacao', 'concluida', 'arquivada')),
  test_notes TEXT NOT NULL DEFAULT '',
  student_observations TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assessment_tests (
  assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  test_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  PRIMARY KEY (assessment_id, test_id),
  UNIQUE (assessment_id, position)
);

CREATE TABLE IF NOT EXISTS results (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  test_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('concluido', 'naoConcluido')),
  side TEXT NOT NULL DEFAULT '',
  official_value REAL,
  unit TEXT NOT NULL DEFAULT '',
  classification TEXT NOT NULL DEFAULT '',
  protocol_version INTEGER NOT NULL DEFAULT 1,
  non_completion_reason TEXT NOT NULL DEFAULT '',
  reference_id TEXT NOT NULL DEFAULT '',
  reference_version INTEGER,
  reference_application_json TEXT NOT NULL DEFAULT '',
  UNIQUE(assessment_id, test_id, side)
);

CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY,
  result_id TEXT NOT NULL REFERENCES results(id) ON DELETE CASCADE,
  ordinal INTEGER NOT NULL CHECK (ordinal > 0),
  side TEXT NOT NULL DEFAULT '',
  value REAL NOT NULL,
  unit TEXT NOT NULL,
  valid INTEGER NOT NULL DEFAULT 1 CHECK (valid IN (0, 1)),
  created_at TEXT NOT NULL,
  UNIQUE (result_id, ordinal)
);

CREATE TABLE IF NOT EXISTS catalog_tests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  unit TEXT NOT NULL,
  configuration_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS references_catalog (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  criteria_json TEXT NOT NULL,
  classification TEXT NOT NULL,
  effective_on TEXT NOT NULL,
  UNIQUE (test_id, version)
);

CREATE TABLE IF NOT EXISTS protocols (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  text TEXT NOT NULL,
  configuration_json TEXT NOT NULL,
  effective_on TEXT NOT NULL,
  UNIQUE (test_id, version)
);

CREATE TABLE IF NOT EXISTS migration_audit (
  id TEXT PRIMARY KEY,
  source_name TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  checksum TEXT NOT NULL,
  counts_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS assessments_person_date_idx
  ON assessments(person_id, assessment_date DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS assessments_status_updated_idx
  ON assessments(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS assessment_tests_assessment_idx
  ON assessment_tests(assessment_id, position);
CREATE INDEX IF NOT EXISTS results_assessment_test_idx
  ON results(assessment_id, test_id, side);
CREATE INDEX IF NOT EXISTS attempts_result_order_idx
  ON attempts(result_id, ordinal);
CREATE INDEX IF NOT EXISTS references_test_effective_idx
  ON references_catalog(test_id, effective_on DESC, version DESC);
