import { describe, expect, test } from 'bun:test'
import { isDue, scheduleReview } from './reviewScheduler.js'

describe('scheduleReview', () => {
  test('newly learned item (no prior progress) schedules a 1-day review on success', () => {
    const before = Date.now()
    const { reviewStage, nextReviewAt } = scheduleReview(null, { correct: true })
    expect(reviewStage).toBe(0)
    expect(nextReviewAt).toBeGreaterThan(before)
    expect(nextReviewAt - before).toBeLessThanOrEqual(24 * 60 * 60 * 1000 + 1000)
  })

  test('a miss resets the review stage to the shortest interval', () => {
    const advanced = scheduleReview({ reviewStage: 3 }, { correct: true })
    const reset = scheduleReview(advanced, { correct: false })
    expect(reset.reviewStage).toBe(0)
  })

  test('repeated correct reviews advance through the interval ladder and cap at the last one', () => {
    let progress = null
    for (let i = 0; i < 10; i++) progress = scheduleReview(progress, { correct: true })
    expect(progress.reviewStage).toBe(4) // 5 intervals, 0-indexed
  })
})

describe('isDue', () => {
  test('an overdue review item is due', () => {
    expect(isDue({ nextReviewAt: Date.now() - 1000 })).toBe(true)
  })

  test('a future-scheduled item is not due yet', () => {
    expect(isDue({ nextReviewAt: Date.now() + 100000 })).toBe(false)
  })

  test('an item with no schedule at all is treated as due', () => {
    expect(isDue(null)).toBe(true)
  })
})
