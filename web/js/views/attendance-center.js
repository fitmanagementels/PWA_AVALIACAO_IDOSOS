function newest(items, field) {
  return [...items].sort((left, right) => String(right[field] || '').localeCompare(String(left[field] || '')))[0] || null;
}

export function reconcileLocalAssessmentStatus(assessment, remoteStatus) {
  const isLocalDraft = assessment && (assessment.status === 'rascunho' || assessment.status === 'pendenteDeSincronizacao');
  const isSettledRemotely = remoteStatus === 'concluida' || remoteStatus === 'arquivada';
  return isLocalDraft && isSettledRemotely ? { ...assessment, status: remoteStatus } : assessment;
}

export function buildAttendanceItems(people, assessments, historiesByPerson) {
  return people.map((person) => {
    const draft = newest(
      assessments.filter((item) => item.personId === person.id && item.status === 'rascunho'),
      'updatedAt',
    );
    const remoteDraft = person.flow?.rascunhoAtivo || null;
    const remoteCompleted = person.flow?.ultimaConcluida ? {
      assessmentId: person.flow.ultimaConcluida.avaliacaoId,
      date: person.flow.ultimaConcluida.data,
      professionalName: person.flow.ultimaConcluida.profissionalNome,
      status: person.flow.ultimaConcluida.status,
      testIds: []
    } : null;
    const history = newest([...(historiesByPerson[person.id] || []), ...(remoteCompleted ? [remoteCompleted] : [])], 'date');

    return {
      person,
      kind: draft ? 'draft' : remoteDraft ? 'remote-draft' : history ? 'history' : 'empty',
      draft,
      remoteDraft,
      history,
    };
  });
}
