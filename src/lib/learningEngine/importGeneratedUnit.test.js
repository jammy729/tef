import { describe, expect, test } from 'bun:test'
import { importGeneratedUnit } from './importGeneratedUnit.js'

const unit = {
  id: 'tech',
  title: 'Technology',
  lessons: [
    {
      id: 'tech-vocab',
      title: 'Tech Vocab',
      learningItemIds: ['logiciel'],
      exercises: [{ id: 'tv-1', learningItemId: 'logiciel', type: 'multiple_choice' }],
    },
  ],
}
const items = { logiciel: { id: 'logiciel', type: 'vocabulary', word: 'logiciel' } }

describe('importGeneratedUnit', () => {
  test('namespaces unit, lesson, item, and exercise ids', () => {
    const result = importGeneratedUnit('r1', unit, items)
    expect(result.unit.id).toBe('gen_r1_tech')
    expect(result.unit.lessons[0].id).toBe('gen_r1_tech-vocab')
    expect(Object.keys(result.items)).toEqual(['gen_r1_logiciel'])
  })

  test('rewrites internal references to namespaced ids', () => {
    const result = importGeneratedUnit('r1', unit, items)
    expect(result.unit.lessons[0].learningItemIds).toEqual(['gen_r1_logiciel'])
    expect(result.unit.lessons[0].exercises[0].learningItemId).toBe('gen_r1_logiciel')
  })
})
