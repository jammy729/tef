// Spec §2: rubric dimensions scored 0-5, mapped to an approximate CLB/CECR band for display.
// ponytail: coarse linear bucket, not an authoritative CLB/TEF conversion table — upgrade if
// TEF-accurate banding is ever required.
const BANDS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export function scoreToBand(score) {
  const idx = Math.max(0, Math.min(BANDS.length - 1, Math.round(score)))
  return BANDS[idx]
}

// Averages whatever score dimensions a session actually has (spec §2 table) rather than a fixed
// list, so this works for any future rubric variant without change.
export function sessionAverage(session) {
  const values = Object.values(session?.scores ?? {})
  if (!values.length) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

// ponytail: naive heuristic — average of the last 5 sessions' rubric scores over the 0-5 scale,
// as a % of "mastery". No weighting/decay/target-level awareness. Good enough for a progress
// indicator, not a certified TEF prediction.
export function goalPercent(sessions) {
  if (!sessions?.length) return 0
  const recent = sessions.slice(-5)
  const avg = recent.reduce((sum, s) => sum + sessionAverage(s), 0) / recent.length
  return Math.round(Math.max(0, Math.min(100, (avg / 5) * 100)))
}

// Error category keys the LLM proxy is instructed to use (api/tutor.js prompts) — each maps to
// an i18n key pair for display. Unknown categories fall back to the raw key as its own title.
export const KNOWN_CATEGORIES = [
  'gender_agreement',
  'subjunctive',
  'passe_compose_imparfait',
  'pronunciation',
  'vocabulary',
  'spelling',
]

export function categoryInfo(category) {
  if (!KNOWN_CATEGORIES.includes(category)) return { titleKey: null, descriptionKey: null, fallback: category }
  return { titleKey: `category.${category}.title`, descriptionKey: `category.${category}.description` }
}
