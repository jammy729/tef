// Replaceable review-scheduling abstraction (spec §3.5) — a plain function, not baked into any
// component. Swap the body for a real spaced-repetition algorithm later without touching callers.
const INTERVALS_DAYS = [1, 3, 7, 14, 30]
const DAY_MS = 24 * 60 * 60 * 1000

export function scheduleReview(prevProgress, { correct }) {
  const prevStage = prevProgress?.reviewStage ?? -1
  const nextStage = correct ? Math.min(prevStage + 1, INTERVALS_DAYS.length - 1) : 0
  const days = INTERVALS_DAYS[nextStage]
  return { reviewStage: nextStage, nextReviewAt: Date.now() + days * DAY_MS }
}

export function isDue(progress, now = Date.now()) {
  return (progress?.nextReviewAt ?? 0) <= now
}
