// Answer evaluation per exercise type (spec §3.2) — every exercise is tap-only (multiple choice,
// a word-bank chip, or ordered word tiles), so every check here is a plain synchronous string
// comparison. No LLM call in the exercise-answering path at all.
export function normalize(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.!?]+$/, '')
}

function acceptedList(answer) {
  return Array.isArray(answer) ? answer : [answer]
}

export function evaluateMultipleChoice(exercise, given) {
  return given === exercise.answer
}

export function evaluateFillBlank(exercise, given) {
  return acceptedList(exercise.answer).some((a) => normalize(a) === normalize(given))
}

// Translation is graded the same leniently-normalized way, against a short list of accepted
// phrasings authored on the exercise — full free-translation equivalence checking isn't needed
// since the learner is choosing from a word bank, not typing freely.
export function evaluateTranslation(exercise, given) {
  return evaluateFillBlank(exercise, given)
}

// Production: the learner builds a sentence by tapping word tiles in order; `given` is the tiles
// joined with spaces. Compared the same normalized way as fill-blank/translation.
export function evaluateProduction(exercise, given) {
  return normalize(given) === normalize(exercise.answer)
}

export function evaluateExercise(exercise, given) {
  switch (exercise.type) {
    case 'multiple_choice':
      return evaluateMultipleChoice(exercise, given)
    case 'fill_blank':
      return evaluateFillBlank(exercise, given)
    case 'translation':
      return evaluateTranslation(exercise, given)
    case 'production':
      return evaluateProduction(exercise, given)
    default:
      return false
  }
}
