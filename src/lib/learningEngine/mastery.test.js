import { describe, expect, test } from 'bun:test'
import { masteryLabel, updateMastery } from './mastery.js'

describe('updateMastery', () => {
  test('first attempt incorrect', () => {
    const p = updateMastery(null, { correct: false, hintsUsed: false, stage: 'recognition' })
    expect(p.timesSeen).toBe(1)
    expect(p.timesIncorrect).toBe(1)
    expect(p.currentStreak).toBe(0)
    expect(p.mastery).toBe(0) // clamped, can't go below 0
  })

  test('second attempt correct after a miss raises mastery and streak', () => {
    const first = updateMastery(null, { correct: false, hintsUsed: false, stage: 'recognition' })
    const second = updateMastery(first, { correct: true, hintsUsed: false, stage: 'recognition' })
    expect(second.timesSeen).toBe(2)
    expect(second.timesCorrect).toBe(1)
    expect(second.currentStreak).toBe(1)
    expect(second.mastery).toBeGreaterThan(0)
  })

  test('repeated incorrect answers keep mastery at the floor, not negative', () => {
    let p = null
    for (let i = 0; i < 5; i++) p = updateMastery(p, { correct: false, hintsUsed: false, stage: 'production' })
    expect(p.mastery).toBe(0)
    expect(p.timesIncorrect).toBe(5)
  })

  test('a hint halves the mastery gain for an otherwise-correct answer', () => {
    const withoutHint = updateMastery(null, { correct: true, hintsUsed: false, stage: 'production' })
    const withHint = updateMastery(null, { correct: true, hintsUsed: true, stage: 'production' })
    expect(withHint.mastery).toBeLessThan(withoutHint.mastery)
  })

  test('production stage rewards more than recognition on a correct answer', () => {
    const recognition = updateMastery(null, { correct: true, hintsUsed: false, stage: 'recognition' })
    const production = updateMastery(null, { correct: true, hintsUsed: false, stage: 'production' })
    expect(production.mastery).toBeGreaterThan(recognition.mastery)
  })

  test('mastery is clamped at 100', () => {
    let p = null
    for (let i = 0; i < 20; i++) p = updateMastery(p, { correct: true, hintsUsed: false, stage: 'production' })
    expect(p.mastery).toBe(100)
  })
})

describe('masteryLabel', () => {
  test.each([
    [0, 'new'],
    [20, 'new'],
    [21, 'learning'],
    [45, 'familiar'],
    [70, 'strong'],
    [95, 'mastered'],
    [100, 'mastered'],
  ])('mastery %d → %s', (mastery, label) => {
    expect(masteryLabel(mastery)).toBe(label)
  })
})
