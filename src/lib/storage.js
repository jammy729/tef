// localStorage persistence per spec §5 data model, namespaced by profile id.
// All reads/writes are try/catch-guarded — localStorage can throw in private browsing.

import { learningItem } from '../content/course'
import { updateMastery } from './learningEngine/mastery'
import { isDue, scheduleReview } from './learningEngine/reviewScheduler'

const KEY = 'tef:v1'
const LOCALE_KEY = 'tef:locale'

function readBlob() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : { lastProfileId: null, profiles: {} }
  } catch {
    return { lastProfileId: null, profiles: {} }
  }
}

function writeBlob(blob) {
  try {
    localStorage.setItem(KEY, JSON.stringify(blob))
  } catch {
    // ponytail: localStorage full/unavailable — session data is lost for this write, not fatal.
  }
}

function readProfile(blob, profileId) {
  const profile = blob.profiles[profileId] ?? {}
  return {
    sessions: profile.sessions ?? [],
    errorStats: profile.errorStats ?? {},
    lessonProgress: profile.lessonProgress ?? {},
    learningProgress: profile.learningProgress ?? {},
  }
}

export function getLastProfileId() {
  try {
    return localStorage.getItem('tef:lastProfileId')
  } catch {
    return null
  }
}

export function setLastProfileId(id) {
  try {
    localStorage.setItem('tef:lastProfileId', id)
  } catch {
    // ignore
  }
}

export function getLocale() {
  try {
    return localStorage.getItem(LOCALE_KEY)
  } catch {
    return null
  }
}

export function setLocale(locale) {
  try {
    localStorage.setItem(LOCALE_KEY, locale)
  } catch {
    // ignore
  }
}

export function getSessions(profileId) {
  return readProfile(readBlob(), profileId).sessions
}

export function getLatestSession(profileId) {
  const sessions = getSessions(profileId)
  return sessions[sessions.length - 1] ?? null
}

export function getErrorStats(profileId) {
  return readProfile(readBlob(), profileId).errorStats
}

// Real past example corrections for one category — the Mistake Bank (spec §3.2.5). Reads
// straight from existing session records, no separate persisted structure.
export function getMistakeExamples(profileId, category, limit = 3) {
  const sessions = getSessions(profileId)
  const examples = []
  for (let i = sessions.length - 1; i >= 0 && examples.length < limit; i--) {
    const items = sessions[i].corrections ?? []
    for (const item of items) {
      if (item?.category === category) examples.push(item)
      if (examples.length >= limit) break
    }
  }
  return examples
}

export function getTopWeakCategories(profileId, n = 2) {
  const stats = getErrorStats(profileId)
  return Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([category, count]) => ({ category, count }))
}

// ponytail: naive consecutive-calendar-day count walking backward from today, using the
// browser's local date — not timezone/DST-robust, good enough for a streak display.
export function getStreakDays(profileId) {
  const sessions = getSessions(profileId)
  if (!sessions.length) return 0

  const days = new Set(sessions.map((s) => new Date(s.startedAt).toDateString()))
  let streak = 0
  const cursor = new Date()
  while (days.has(cursor.toDateString())) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

function bumpErrorStats(errorStats, session) {
  const next = { ...errorStats }
  for (const correction of session.corrections ?? []) {
    if (!correction?.category) continue
    next[correction.category] = (next[correction.category] ?? 0) + 1
  }
  for (const category of session.focusAreas ?? []) {
    next[category] = (next[category] ?? 0) + 1
  }
  return next
}

// Appends a completed call session and bumps errorStats from its corrections/focusAreas.
export function addSession(profileId, session) {
  const blob = readBlob()
  const current = readProfile(blob, profileId)

  blob.profiles[profileId] = {
    ...current,
    sessions: [...current.sessions, session],
    errorStats: bumpErrorStats(current.errorStats, session),
  }
  writeBlob(blob)
  return blob.profiles[profileId]
}

// --- Learn & Practice (spec §3.3) ---

export function getLessonProgressMap(profileId) {
  return readProfile(readBlob(), profileId).lessonProgress
}

export function getLessonStatus(profileId, lessonId) {
  return getLessonProgressMap(profileId)[lessonId] ?? 'not_started'
}

export function setLessonStatus(profileId, lessonId, status) {
  const blob = readBlob()
  const current = readProfile(blob, profileId)
  blob.profiles[profileId] = {
    ...current,
    lessonProgress: { ...current.lessonProgress, [lessonId]: status },
  }
  writeBlob(blob)
}

export function getLearningProgress(profileId) {
  return readProfile(readBlob(), profileId).learningProgress
}

export function getItemProgress(profileId, itemId) {
  return getLearningProgress(profileId)[itemId] ?? null
}

// Updates one learning item's mastery + review schedule from a single exercise attempt (spec
// §3.3, the mastery/review-scheduler engine — src/lib/learningEngine/). Called once per exercise,
// not once per lesson, so a completed lesson can still leave some of its items under-mastered.
export function recordAttempt(profileId, itemId, { correct, hintsUsed, stage }) {
  const blob = readBlob()
  const current = readProfile(blob, profileId)
  const prev = current.learningProgress[itemId] ?? null

  const mastery = updateMastery(prev, { correct, hintsUsed, stage })
  const review = scheduleReview(prev, { correct })
  const next = { ...mastery, ...review }

  blob.profiles[profileId] = {
    ...current,
    learningProgress: { ...current.learningProgress, [itemId]: next },
  }
  writeBlob(blob)
  return next
}

// Items due for review, weakest first (spec §3.3's review queue) — a plain filter/sort over
// existing progress, no separate schedule table.
export function getDueReviewItems(profileId, limit = 20) {
  const progress = getLearningProgress(profileId)
  return Object.entries(progress)
    .filter(([, p]) => isDue(p))
    .sort((a, b) => a[1].mastery - b[1].mastery)
    .slice(0, limit)
    .map(([itemId, p]) => ({ itemId, progress: p }))
}

// A read-only shape of what the learner is strong/weak at, keyed off real mastery data — feeds
// the Call's mastered-expression theming (spec §3.2.6) and is the extension point spec §3.3.5
// sets aside for a future fuller AI Coach.
export function getLearnerLearningContext(profileId) {
  const progress = getLearningProgress(profileId)
  const strongVocabulary = []
  const weakVocabulary = []
  const weakGrammar = []
  const recentExpressions = []
  const masteredExpressions = []

  for (const [itemId, p] of Object.entries(progress)) {
    const item = learningItem(itemId)
    if (!item) continue
    if (item.type === 'vocabulary') {
      if (p.mastery >= 70) strongVocabulary.push(item.word)
      else if (p.mastery < 50) weakVocabulary.push(item.word)
    } else if (item.type === 'grammar' && p.mastery < 50) {
      weakGrammar.push(item.title)
    } else if (item.type === 'phrase' && p.lastPracticedAt) {
      recentExpressions.push(item.phrase)
      if (p.mastery >= 61) masteredExpressions.push(item.phrase) // Strong/Mastered bands
    }
  }

  return { strongVocabulary, weakVocabulary, weakGrammar, recentExpressions, masteredExpressions }
}
