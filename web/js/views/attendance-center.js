function newest(items, field) {
  return [...items].sort((left, right) => String(right[field] || '').localeCompare(String(left[field] || '')))[0] || null;
}

export function buildAttendanceItems(people, assessments, historiesByPerson) {
  return people.map((person) => {
    const draft = newest(
      assessments.filter((item) => item.personId === person.id && item.status === 'rascunho'),
      'updatedAt',
    );
    const history = newest(historiesByPerson[person.id] || [], 'date');

    return {
      person,
      kind: draft ? 'draft' : history ? 'history' : 'empty',
      draft,
      history: draft ? null : history,
    };
  });
}
