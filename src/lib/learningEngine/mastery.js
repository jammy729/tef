// Pure mastery calculation — no React, no I/O (spec §3.5 architecture rule: learning logic lives
// here, not in components). A learner's per-item progress record shape:
// { recognitionScore, recallScore, productionScore, timesSeen, timesCorrect, timesIncorrect,
//   currentStreak, mastery, lastPracticedAt }

export const MASTERY_LEVELS = [
  { max: 20, label: 'new' },
  { max: 40, label: 'learning' },
  { max: 60, label: 'familiar' },
  { max: 80, label: 'strong' },
  { max: 100, label: 'mastered' },
]

export function masteryLabel(mastery) {
  return (MASTERY_LEVELS.find((l) => mastery <= l.max) ?? MASTERY_LEVELS[MASTERY_LEVELS.length - 1]).label
}

const STAGE_DELTA = { recognition: 6, recall: 8, context: 8, completion: 8, transformation: 10, production: 12 }

function emptyProgress() {
  return {
    recognitionScore: 0,
    recallScore: 0,
    productionScore: 0,
    timesSeen: 0,
    timesCorrect: 0,
    timesIncorrect: 0,
    currentStreak: 0,
    mastery: 0,
    lastPracticedAt: null,
  }
}

// ponytail: a single scalar `mastery` moved by a per-stage delta (bigger reward for harder
// stages, halved when a hint was used, a flat penalty on a miss) — not the three separate
// recognition/recall/production sub-scores the prompt sketches. Simpler to reason about and to
// review-schedule from; split them out later if per-skill mastery breakdowns are actually needed.
export function updateMastery(prevProgress, { correct, hintsUsed, stage }) {
  const prev = prevProgress ?? emptyProgress()
  const timesSeen = prev.timesSeen + 1
  const timesCorrect = prev.timesCorrect + (correct ? 1 : 0)
  const timesIncorrect = prev.timesIncorrect + (correct ? 0 : 1)
  const currentStreak = correct ? prev.currentStreak + 1 : 0

  let delta = correct ? (STAGE_DELTA[stage] ?? 6) : -8
  if (correct && hintsUsed) delta = Math.round(delta * 0.5)

  const mastery = Math.max(0, Math.min(100, prev.mastery + delta))

  return {
    ...prev,
    timesSeen,
    timesCorrect,
    timesIncorrect,
    currentStreak,
    mastery,
    lastPracticedAt: Date.now(),
  }
}
