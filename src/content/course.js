// Static Learn & Practice content (spec §3.2) — Course → Level → Unit → Lesson, written once,
// not fetched from a CMS/database (this app has no database at all, per spec §5). The actual
// unit content lives in src/content/units/*.js — one module per unit (the Opinions seed unit plus
// one unit per official TEF theme, spec §3.2.1). This file is a thin assembler that merges those
// modules with AI-generated units and exposes the stable lookup functions the rest of the app
// uses. Every LearningItem and Exercise has a stable id so progress/review records can reference
// it across sessions, and so the Call's mastered-expression theming can read the same ids
// (spec §3.2.6/§3.2.7). Every exercise is tap-only — no typing anywhere (spec §3.2.2).

import * as opinions from './units/opinions'
import * as travail from './units/travail'
import * as environnement from './units/environnement'
import * as technologies from './units/technologies'
import * as sante from './units/sante'
import * as education from './units/education'
import * as famille from './units/famille'
import * as societe from './units/societe'
import * as medias from './units/medias'
import * as culture from './units/culture'
import * as economie from './units/economie'
import * as transports from './units/transports'
import * as consommation from './units/consommation'
import * as sport from './units/sport'
import * as politique from './units/politique'

// Canonical order: the Opinions foundation unit first, then the official TEF themes.
const UNIT_MODULES = [
  opinions,
  travail,
  environnement,
  technologies,
  sante,
  education,
  famille,
  societe,
  medias,
  culture,
  economie,
  transports,
  consommation,
  sport,
  politique,
]

export const LEARNING_ITEMS = Object.assign({}, ...UNIT_MODULES.map((module) => module.items))

export const COURSE = {
  id: 'french',
  levels: [
    {
      id: 'b1',
      label: 'B1',
      units: UNIT_MODULES.map((module) => module.unit),
    },
  ],
}

export function getAllUnits() {
  return [...COURSE.levels[0].units, ...getGeneratedUnits()]
}

export function getAllLessons() {
  return getAllUnits().flatMap((unit) => unit.lessons.map((lesson) => ({ ...lesson, unitId: unit.id })))
}

export function getLesson(lessonId) {
  return getAllLessons().find((lesson) => lesson.id === lessonId) ?? null
}

export function getUnit(unitId) {
  return getAllUnits().find((unit) => unit.id === unitId) ?? null
}

// Reuses each item's already-authored exercises for review rather than generating new content on
// the fly — keeps review sessions free/instant and avoids a second content-authoring surface.
export function getReviewExercises(itemIds) {
  const allExercises = getAllLessons().flatMap((lesson) => lesson.exercises)
  const byItem = new Map()
  for (const exercise of allExercises) {
    if (itemIds.includes(exercise.learningItemId) && !byItem.has(exercise.learningItemId)) {
      byItem.set(exercise.learningItemId, exercise)
    }
  }
  return itemIds.map((id) => byItem.get(id)).filter(Boolean)
}

export function learningItem(id) {
  return LEARNING_ITEMS[id] ?? getGeneratedItem(id) ?? null
}

// Imported at the bottom to avoid a circular-looking top-of-file dependency read — generatedContent.js
// is a leaf module (localStorage only), so this is a plain one-way dependency, not a real cycle.
import { getGeneratedItem, getGeneratedUnits } from '../lib/generatedContent'