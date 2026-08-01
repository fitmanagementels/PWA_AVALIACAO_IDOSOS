function doGet(e) {
  const action = (e.parameter && e.parameter.action) || 'health';
  const handlers = { health: function() { return jsonOk_({ service: 'pwa-avaliacao-idosos' }); }, listPeople: listPeople, getPerson: getPerson, getAssessment: getAssessment, getHistory: getHistory, getCatalog: getCatalog };
  return jsonOutput_(handlers[action] ? handlers[action](e.parameter || {}) : jsonError_('NOT_FOUND', 'Ação não encontrada'));
}

function doPost(e) {
  try {
    const request = JSON.parse((e.postData && e.postData.contents) || '{}');
    const handlers = { savePerson: savePerson, createAssessment: createAssessment, saveAssessment: saveAssessment, completeAssessment: completeAssessment, generateReport: generateReport };
    return jsonOutput_(handlers[request.action] ? handlers[request.action](request.payload || {}) : jsonError_('NOT_FOUND', 'Ação não encontrada'));
  } catch (error) {
    return jsonOutput_(jsonError_('BAD_REQUEST', error.message));
  }
}

function jsonOk_(data) { return { ok: true, data: data, meta: { updatedAt: new Date().toISOString() } }; }
function jsonError_(code, message) { return { ok: false, error: { code: code, message: message } }; }
function jsonOutput_(payload) { return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON); }
