// Shape / referential-integrity tests for the assembled course (spec §3.2).
// Run with: bun test. No framework — plain node:assert.
import assert from 'node:assert/strict'
import { test } from 'bun:test'

import { COURSE, LEARNING_ITEMS, getAllLessons, getAllUnits, getLesson, getUnit, getReviewExercises, learningItem } from './course'

const TAP_ONLY_TYPES = ['multiple_choice', 'fill_blank', 'translation', 'production']
const STAGES = ['recognition', 'recall', 'context', 'transformation', 'completion', 'production']
const LEVEL_COUNT = 15

test('course has one level of hand-authored units covering all TEF themes', () => {
  assert.equal(COURSE.levels.length, 1)
  const level = COURSE.levels[0]
  assert.equal(level.label, 'B1')
  assert.equal(level.units.length, LEVEL_COUNT)
  const ids = level.units.map((unit) => unit.id)
  assert.deepEqual(new Set(ids).size, ids.length, 'unit ids must be unique')
  assert.equal(ids[0], 'opinions', 'the Opinions foundation unit must stay first')
})

test('every unit/lesson/item/exercise has a non-empty id and the shape consumers rely on', () => {
  for (const unit of COURSE.levels[0].units) {
    assert.ok(unit.id && unit.title && unit.description && unit.lessons.length >= 3, `unit ${unit.id} incomplete`)
    for (const lesson of unit.lessons) {
      assert.ok(lesson.id && lesson.title)
      assert.ok(Array.isArray(lesson.learningItemIds) && lesson.learningItemIds.length > 0, `lesson ${lesson.id} without items`)
      assert.ok(Array.isArray(lesson.exercises) && lesson.exercises.length >= 6, `lesson ${lesson.id} needs >= 6 exercises`)
      for (const exercise of lesson.exercises) {
        assert.ok(exercise.id, `exercise without id in ${lesson.id}`)
        assert.ok(TAP_ONLY_TYPES.includes(exercise.type), `${exercise.id}: type ${exercise.type} is not tap-only`)
        assert.ok(STAGES.includes(exercise.stage), `${exercise.id}: unknown stage ${exercise.stage}`)
        if (exercise.type === 'production') {
          assert.ok(Array.isArray(exercise.content.tiles) && exercise.content.tiles.length >= 4, `${exercise.id}: production needs tiles`)
        } else {
          assert.ok(Array.isArray(exercise.content.options) && exercise.content.options.length >= 2, `${exercise.id}: needs options`)
        }
      }
    }
  }
})

test('every learningItemId used resolves to a real item, and item ids are globally unique', () => {
  const exerciseItemIds = getAllLessons().flatMap((lesson) => lesson.exercises.map((e) => e.learningItemId))
  for (const itemId of exerciseItemIds) {
    assert.ok(learningItem(itemId), `unresolvable learningItemId ${itemId}`)
  }
  for (const unit of COURSE.levels[0].units) {
    for (const lesson of unit.lessons) {
      for (const itemId of lesson.learningItemIds) {
        assert.ok(learningItem(itemId), `lesson ${lesson.id} references unknown item ${itemId}`)
      }
    }
  }
  const ids = Object.keys(LEARNING_ITEMS)
  assert.deepEqual(new Set(ids).size, ids.length, 'item ids must be unique')
  for (const [key, item] of Object.entries(LEARNING_ITEMS)) {
    assert.equal(item.id, key, `item key ${key} must match its id`)
    assert.ok(['vocabulary', 'phrase', 'grammar'].includes(item.type), `${item.id}: unknown type ${item.type}`)
  }
})

test('lookup helpers resolve hand-authored and (if present) generated content consistently', () => {
  const allUnits = getAllUnits()
  assert.ok(allUnits.length >= LEVEL_COUNT)
  for (const unit of allUnits) {
    assert.equal(getUnit(unit.id)?.id, unit.id)
  }
  const lesson = getAllLessons()[0]
  assert.equal(getLesson(lesson.id)?.id, lesson.id)
  assert.ok(getLesson('does-not-exist') === null)
  assert.equal(learningItem('a-mon-avis')?.id, 'a-mon-avis')
  assert.equal(learningItem('does-not-exist'), null)
})

test('getReviewExercises returns one already-authored exercise per requested item', () => {
  const reviewed = getReviewExercises(['a-mon-avis', 'entreprise'])
  assert.equal(reviewed.length, 2)
  assert.equal(reviewed[0].learningItemId, 'a-mon-avis')
  assert.equal(reviewed[1].learningItemId, 'entreprise')
  assert.deepEqual(getReviewExercises(['does-not-exist']), [])
})