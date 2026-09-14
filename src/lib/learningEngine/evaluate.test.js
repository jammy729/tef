import { describe, expect, test } from 'bun:test'
import { evaluateFillBlank, evaluateMultipleChoice, evaluatePronunciation, evaluateTranslation } from './evaluate.js'

describe('evaluateMultipleChoice', () => {
  test('matches the exact option string', () => {
    const exercise = { answer: 'essentielle' }
    expect(evaluateMultipleChoice(exercise, 'essentielle')).toBe(true)
    expect(evaluateMultipleChoice(exercise, 'essentiel')).toBe(false)
  })
})

describe('evaluateFillBlank', () => {
  test('normalizes case and surrounding whitespace', () => {
    const exercise = { answer: 'essentiel' }
    expect(evaluateFillBlank(exercise, '  Essentiel  ')).toBe(true)
  })

  test('ignores a trailing period', () => {
    expect(evaluateFillBlank({ answer: 'peuvent' }, 'peuvent.')).toBe(true)
  })

  test('accepts any answer in an accepted-answers array', () => {
    const exercise = { answer: ['à mon avis', 'selon moi'] }
    expect(evaluateFillBlank(exercise, 'Selon moi')).toBe(true)
    expect(evaluateFillBlank(exercise, 'en revanche')).toBe(false)
  })

  test('rejects a wrong answer', () => {
    expect(evaluateFillBlank({ answer: 'peuvent' }, 'peut')).toBe(false)
  })
})

describe('evaluateTranslation', () => {
  test('behaves like fill-blank (lenient, accepted-list based)', () => {
    expect(evaluateTranslation({ answer: ['essentiel', 'indispensable'] }, 'Indispensable')).toBe(true)
  })
})

describe('evaluatePronunciation', () => {
  test('accepts an exact (normalized) transcript match', () => {
    const exercise = { answer: 'À mon avis, le télétravail est utile.' }
    expect(evaluatePronunciation(exercise, 'À mon avis, le télétravail est utile.')).toBe(true)
    expect(evaluatePronunciation(exercise, '  à mon avis, le télétravail est utile  ')).toBe(true)
  })

  test('accepts a close-enough transcript (word-overlap heuristic)', () => {
    const exercise = { answer: 'Ils peuvent travailler le week-end.' }
    expect(evaluatePronunciation(exercise, 'Ils peuvent travailler le weekend.')).toBe(true)
  })

  test('rejects an unrelated transcript', () => {
    const exercise = { answer: 'Ils peuvent travailler le week-end.' }
    expect(evaluatePronunciation(exercise, 'Bonjour tout le monde')).toBe(false)
  })

  test('rejects an empty transcript', () => {
    expect(evaluatePronunciation({ answer: 'Selon moi.' }, '')).toBe(false)
  })
})
