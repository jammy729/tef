// Answer evaluation per exercise type (spec §3.2) — multiple choice/fill-blank/translation are
// tap-only (a word-bank chip), pronunciation is spoken; every check here is a plain synchronous
// comparison against the recognized/tapped answer. No LLM call in the exercise-answering path.
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

// Pronunciation: the learner speaks the target sentence; `given` is whatever SpeechRecognition
// transcribed. True phoneme-level scoring is out of scope (spec §6 non-goal) and this app has no
// acoustic confidence signal to lean on either (browsers don't expose one reliably), so this is a
// text-similarity heuristic instead — the closest honest proxy available client-side: an exact
// normalized match passes immediately; otherwise, if the recognizer heard most of the same words
// (>= 70% word overlap against the target), that's close enough to call it understood. ponytail:
// word-overlap, not edit-distance or real pronunciation scoring — revisit if this proves too
// lenient/strict in practice.
export function evaluatePronunciation(exercise, given) {
  const target = normalize(exercise.answer)
  const said = normalize(given)
  if (!said) return false
  if (said === target) return true
  const targetWords = target.split(' ').filter(Boolean)
  if (!targetWords.length) return false
  const saidWords = new Set(said.split(' ').filter(Boolean))
  const matched = targetWords.filter((w) => saidWords.has(w)).length
  return matched / targetWords.length >= 0.7
}

export function evaluateExercise(exercise, given) {
  switch (exercise.type) {
    case 'multiple_choice':
      return evaluateMultipleChoice(exercise, given)
    case 'fill_blank':
      return evaluateFillBlank(exercise, given)
    case 'translation':
      return evaluateTranslation(exercise, given)
    case 'pronunciation':
      return evaluatePronunciation(exercise, given)
    default:
      return false
  }
}
