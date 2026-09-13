// Namespaces a freshly AI-generated unit's ids so they can never collide with static content ids
// (src/content/course.js) or with a previous generation run — pure function, no I/O (spec §3.2.3).
export function importGeneratedUnit(runId, unit, items) {
  const rename = (id) => `gen_${runId}_${id}`

  const namespacedItems = {}
  for (const [id, item] of Object.entries(items)) {
    namespacedItems[rename(id)] = { ...item, id: rename(id) }
  }

  const namespacedUnit = {
    ...unit,
    id: rename(unit.id),
    lessons: unit.lessons.map((lesson) => ({
      ...lesson,
      id: rename(lesson.id),
      learningItemIds: lesson.learningItemIds.map(rename),
      exercises: lesson.exercises.map((exercise) => ({
        ...exercise,
        id: rename(exercise.id),
        learningItemId: rename(exercise.learningItemId),
      })),
    })),
  }

  return { unit: namespacedUnit, items: namespacedItems }
}
