import { HttpError } from './http.js';

const activeStatuses = ['rascunho', 'pendenteDeSincronizacao'];

function mapAssessment(row) {
  return {
    id: row.id, personId: row.person_id, assessmentDate: row.assessment_date,
    professionalId: row.professional_id, professionalName: row.professional_name || '',
    status: row.status, testNotes: row.test_notes, studentObservations: row.student_observations,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function mapResult(row) {
  return {
    id: row.id, assessmentId: row.assessment_id, testId: row.test_id, status: row.status,
    side: row.side, officialValue: row.official_value, unit: row.unit, classification: row.classification,
    protocolVersion: row.protocol_version, nonCompletionReason: row.non_completion_reason,
    referenceId: row.reference_id, referenceVersion: row.reference_version,
    referenceApplicationJson: row.reference_application_json, attempts: [],
  };
}

function statement(db, sql, ...values) {
  return db.prepare(sql).bind(...values);
}

export async function listPeople(db) {
  const { results } = await db.prepare(`
    SELECT p.*, 
      (SELECT a.id FROM assessments a WHERE a.person_id = p.id AND a.status IN ('rascunho', 'pendenteDeSincronizacao') ORDER BY a.updated_at DESC LIMIT 1) AS active_draft_id,
      (SELECT a.assessment_date FROM assessments a WHERE a.person_id = p.id AND a.status IN ('rascunho', 'pendenteDeSincronizacao') ORDER BY a.updated_at DESC LIMIT 1) AS active_draft_date,
      (SELECT pr.name FROM assessments a JOIN professionals pr ON pr.id = a.professional_id WHERE a.person_id = p.id AND a.status IN ('rascunho', 'pendenteDeSincronizacao') ORDER BY a.updated_at DESC LIMIT 1) AS active_draft_professional_name,
      (SELECT a.updated_at FROM assessments a WHERE a.person_id = p.id AND a.status IN ('rascunho', 'pendenteDeSincronizacao') ORDER BY a.updated_at DESC LIMIT 1) AS active_draft_updated_at,
      (SELECT a.id FROM assessments a WHERE a.person_id = p.id AND a.status = 'concluida' ORDER BY a.updated_at DESC LIMIT 1) AS latest_completed_id,
      (SELECT a.assessment_date FROM assessments a WHERE a.person_id = p.id AND a.status = 'concluida' ORDER BY a.updated_at DESC LIMIT 1) AS latest_completed_date,
      (SELECT pr.name FROM assessments a JOIN professionals pr ON pr.id = a.professional_id WHERE a.person_id = p.id AND a.status = 'concluida' ORDER BY a.updated_at DESC LIMIT 1) AS latest_completed_professional_name,
      (SELECT a.updated_at FROM assessments a WHERE a.person_id = p.id AND a.status = 'concluida' ORDER BY a.updated_at DESC LIMIT 1) AS latest_completed_updated_at
    FROM people p WHERE p.status != 'arquivado' ORDER BY p.full_name COLLATE NOCASE
  `).all();
  return results.map((row) => ({
    id: row.id, fullName: row.full_name, birthDate: row.birth_date, sex: row.sex, whatsapp: row.whatsapp,
    status: row.status, createdAt: row.created_at,
    flow: {
      activeDraft: row.active_draft_id ? {
        id: row.active_draft_id, assessmentDate: row.active_draft_date, professionalName: row.active_draft_professional_name,
        status: 'rascunho', updatedAt: row.active_draft_updated_at,
      } : null,
      latestCompleted: row.latest_completed_id ? {
        id: row.latest_completed_id, assessmentDate: row.latest_completed_date, professionalName: row.latest_completed_professional_name,
        status: 'concluida', updatedAt: row.latest_completed_updated_at,
      } : null,
    },
  }));
}

export async function getPerson(db, personId) {
  const row = await statement(db, 'SELECT * FROM people WHERE id = ?', personId).first();
  if (!row) throw new HttpError(404, 'NOT_FOUND', 'Pessoa não encontrada');
  return { id: row.id, fullName: row.full_name, birthDate: row.birth_date, sex: row.sex, whatsapp: row.whatsapp, status: row.status, createdAt: row.created_at };
}

export async function savePerson(db, person, now) {
  const id = person.id;
  await statement(db, `INSERT INTO people (id, full_name, birth_date, sex, whatsapp, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET full_name = excluded.full_name, birth_date = excluded.birth_date, sex = excluded.sex, whatsapp = excluded.whatsapp, status = excluded.status`,
  id, person.fullName, person.birthDate, person.sex, String(person.whatsapp || '').replace(/\D/g, ''), person.status || 'ativo', person.createdAt || now).run();
  return getPerson(db, id);
}

export async function getPersonFlow(db, personId) {
  const { results } = await statement(db, `SELECT a.id, a.assessment_date, a.professional_id, pr.name AS professional_name, a.status, a.updated_at FROM assessments a
    JOIN professionals pr ON pr.id = a.professional_id
    WHERE a.person_id = ? AND a.status IN ('rascunho', 'pendenteDeSincronizacao', 'concluida')
    ORDER BY updated_at DESC`, personId).all();
  const compact = (row) => row && ({ id: row.id, assessmentDate: row.assessment_date, professionalId: row.professional_id, professionalName: row.professional_name, status: row.status, updatedAt: row.updated_at });
  return { activeDraft: compact(results.find((row) => activeStatuses.includes(row.status))), latestCompleted: compact(results.find((row) => row.status === 'concluida')) };
}

export async function createAssessment(db, input, now) {
  const active = await statement(db, `SELECT id FROM assessments WHERE person_id = ? AND status IN ('rascunho', 'pendenteDeSincronizacao') LIMIT 1`, input.personId).first();
  if (active && active.id !== input.id) throw new HttpError(409, 'ACTIVE_DRAFT_EXISTS', 'Já existe uma avaliação em andamento para esta pessoa. Retome ou arquive o rascunho antes de criar outra.');
  await saveAssessment(db, { ...input, createdAt: input.createdAt || now, results: input.results || [] }, { complete: false, now });
  return getAssessment(db, input.id);
}

export async function saveAssessment(db, input, { complete = false, now }) {
  const status = complete ? 'concluida' : (input.status || 'rascunho');
  const statements = [
    statement(db, `INSERT INTO assessments (id, person_id, assessment_date, professional_id, status, test_notes, student_observations, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET person_id = excluded.person_id, assessment_date = excluded.assessment_date, professional_id = excluded.professional_id,
      status = excluded.status, test_notes = excluded.test_notes, student_observations = excluded.student_observations, updated_at = excluded.updated_at`,
    input.id, input.personId, input.assessmentDate, input.professionalId, status, input.testNotes || '', input.studentObservations || '', input.createdAt || now, now),
    statement(db, 'DELETE FROM assessment_tests WHERE assessment_id = ?', input.id),
  ];

  for (const [position, testId] of (input.testIds || []).entries()) {
    statements.push(statement(db, 'INSERT INTO assessment_tests (assessment_id, test_id, position) VALUES (?, ?, ?)', input.id, testId, position));
  }

  const selected = input.testIds || [];
  if (selected.length) {
    statements.push(statement(db, `DELETE FROM results WHERE assessment_id = ? AND test_id NOT IN (${selected.map(() => '?').join(', ')})`, input.id, ...selected));
  }

  for (const result of (input.results || [])) {
    statements.push(statement(db, `INSERT INTO results (id, assessment_id, test_id, status, side, official_value, unit, classification, protocol_version, non_completion_reason, reference_id, reference_version, reference_application_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET status = excluded.status, side = excluded.side, official_value = excluded.official_value, unit = excluded.unit,
      classification = excluded.classification, protocol_version = excluded.protocol_version, non_completion_reason = excluded.non_completion_reason,
      reference_id = excluded.reference_id, reference_version = excluded.reference_version, reference_application_json = excluded.reference_application_json`,
    result.id, input.id, result.testId, result.status, result.side || '', result.officialValue ?? null, result.unit || '', result.classification || '', result.protocolVersion || 1,
    result.nonCompletionReason || '', result.referenceId || '', result.referenceVersion ?? null, result.referenceApplicationJson || ''));
    statements.push(statement(db, 'DELETE FROM attempts WHERE result_id = ?', result.id));
    for (const attempt of (result.attempts || [])) {
      statements.push(statement(db, `INSERT INTO attempts (id, result_id, ordinal, side, value, unit, valid, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET ordinal = excluded.ordinal, side = excluded.side, value = excluded.value, unit = excluded.unit, valid = excluded.valid`,
      attempt.id, result.id, attempt.ordinal, attempt.side || result.side || '', attempt.value, attempt.unit || result.unit || '', attempt.valid === false ? 0 : 1, attempt.createdAt || now));
    }
  }

  if (complete) statements.push(statement(db, `UPDATE assessments SET status = 'arquivada', updated_at = ?
    WHERE person_id = ? AND id != ? AND status IN ('rascunho', 'pendenteDeSincronizacao')`, now, input.personId, input.id));

  await db.batch(statements);
  return { assessmentId: input.id, updatedAt: now, status };
}

export async function getAssessment(db, assessmentId) {
  const assessmentRow = await statement(db, `SELECT a.*, p.full_name AS person_name, pr.name AS professional_name
    FROM assessments a JOIN people p ON p.id = a.person_id JOIN professionals pr ON pr.id = a.professional_id WHERE a.id = ?`, assessmentId).first();
  if (!assessmentRow) throw new HttpError(404, 'NOT_FOUND', 'Avaliação não encontrada');
  const { results: resultRows } = await statement(db, 'SELECT * FROM results WHERE assessment_id = ? ORDER BY test_id, side', assessmentId).all();
  const results = resultRows.map(mapResult);
  if (results.length) {
    const { results: attempts } = await statement(db, `SELECT * FROM attempts WHERE result_id IN (${results.map(() => '?').join(', ')}) ORDER BY ordinal`, ...results.map((result) => result.id)).all();
    const byResult = new Map(results.map((result) => [result.id, result]));
    attempts.forEach((attempt) => byResult.get(attempt.result_id)?.attempts.push({ id: attempt.id, ordinal: attempt.ordinal, side: attempt.side, value: attempt.value, unit: attempt.unit, valid: Boolean(attempt.valid), createdAt: attempt.created_at }));
  }
  const { results: testRows } = await statement(db, 'SELECT test_id FROM assessment_tests WHERE assessment_id = ? ORDER BY position', assessmentId).all();
  return { assessment: { ...mapAssessment(assessmentRow), personName: assessmentRow.person_name, testIds: testRows.map((row) => row.test_id) }, results };
}

export async function getPersonHistory(db, personId) {
  const { results: assessmentRows } = await statement(db, `SELECT a.*, pr.name AS professional_name FROM assessments a
    JOIN professionals pr ON pr.id = a.professional_id
    WHERE a.person_id = ? AND a.status != 'arquivada'
    ORDER BY a.assessment_date DESC, a.updated_at DESC`, personId).all();
  if (!assessmentRows.length) return [];
  const ids = assessmentRows.map((assessment) => assessment.id);
  const { results: resultRows } = await statement(db, `SELECT * FROM results WHERE assessment_id IN (${ids.map(() => '?').join(', ')}) ORDER BY test_id, side`, ...ids).all();
  const byAssessment = new Map(assessmentRows.map((row) => [row.id, []]));
  resultRows.forEach((row) => byAssessment.get(row.assessment_id).push(mapResult(row)));
  return assessmentRows.map((row) => ({ assessment: mapAssessment(row), results: byAssessment.get(row.id) }));
}

async function editableAssessment(db, assessmentId) {
  const assessment = await statement(db, 'SELECT id, status FROM assessments WHERE id = ?', assessmentId).first();
  if (!assessment) throw new HttpError(404, 'NOT_FOUND', 'Avaliação não encontrada');
  if (!activeStatuses.includes(assessment.status)) throw new HttpError(409, 'ASSESSMENT_NOT_EDITABLE', 'Esta avaliação não pode mais ser editada.');
  return assessment;
}

export async function removeAssessmentTest(db, assessmentId, testId) {
  await editableAssessment(db, assessmentId);
  await statement(db, 'DELETE FROM assessment_tests WHERE assessment_id = ? AND test_id = ?', assessmentId, testId).run();
  await statement(db, 'DELETE FROM results WHERE assessment_id = ? AND test_id = ?', assessmentId, testId).run();
  return { assessmentId, testId };
}

export async function archiveAssessment(db, assessmentId, now) {
  await editableAssessment(db, assessmentId);
  await statement(db, "UPDATE assessments SET status = 'arquivada', updated_at = ? WHERE id = ?", now, assessmentId).run();
  return { assessmentId, status: 'arquivada', updatedAt: now };
}

export async function deleteArchivedAssessment(db, assessmentId) {
  const assessment = await statement(db, 'SELECT status FROM assessments WHERE id = ?', assessmentId).first();
  if (!assessment) throw new HttpError(404, 'NOT_FOUND', 'Avaliação não encontrada');
  if (assessment.status !== 'arquivada') throw new HttpError(409, 'ASSESSMENT_NOT_ARCHIVED', 'Apenas avaliações arquivadas podem ser excluídas.');
  await statement(db, 'DELETE FROM assessments WHERE id = ?', assessmentId).run();
  return { assessmentId, deleted: true };
}

export async function listArchivedDrafts(db) {
  const { results } = await db.prepare(`SELECT a.*, p.full_name AS person_name, pr.name AS professional_name
    FROM assessments a JOIN people p ON p.id = a.person_id JOIN professionals pr ON pr.id = a.professional_id
    WHERE a.status = 'arquivada' ORDER BY a.updated_at DESC`).all();
  return results.map((row) => ({ ...mapAssessment(row), personName: row.person_name }));
}

export async function getCatalog(db) {
  const { results } = await db.prepare('SELECT * FROM catalog_tests ORDER BY domain, name').all();
  return {
    tests: results.map((row) => ({
      id: row.id, name: row.name, domain: row.domain, unit: row.unit,
      configuration: JSON.parse(row.configuration_json || '{}'),
    })),
  };
}
