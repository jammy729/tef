// Client-side LLM usage tracking — how many /api/tutor calls the learner has made and the last
// provider connection-test result, surfaced on the Progress dashboard (spec §6). Same storage
// pattern as settings.js/generatedContent.js: its own global localStorage key, shared across
// profiles, since it's device/app activity, not personal data. Call counts only — the proxy
// doesn't return token counts, so tokens/cost are deliberately out of scope.

const USAGE_KEY = 'tef:usage:v1'

const MAX_CALLS = 500

export function getUsage() {
  try {
    const raw = localStorage.getItem(USAGE_KEY)
    if (!raw) return { calls: [], lastTest: null }
    const parsed = JSON.parse(raw)
    const calls = Array.isArray(parsed.calls)
      ? parsed.calls.filter((c) => c && typeof c.provider === 'string' && typeof c.timestamp === 'number')
      : []
    const lastTest = parsed.lastTest && typeof parsed.lastTest === 'object' ? parsed.lastTest : null
    return { calls, lastTest }
  } catch {
    return { calls: [], lastTest: null }
  }
}

function saveUsage(usage) {
  localStorage.setItem(USAGE_KEY, JSON.stringify(usage))
}

// Record one /api/tutor request that reached the proxy. provider comes from settings, type is the
// request type (turn/score/translate/ask/drill/itemDrill/generateUnit/test). Bounded to the most
// recent MAX_CALLS entries so the localStorage blob can't grow unbounded.
export function recordCall(provider, type) {
  const usage = getUsage()
  usage.calls = [...usage.calls, { provider, type, timestamp: Date.now() }].slice(-MAX_CALLS)
  saveUsage(usage)
}

// Record the outcome of the Settings screen's "Test connection" — status is one of ok / auth /
// quota / generic, mirroring settings.test.* keys. The dashboard shows the most recent result.
export function recordTest(provider, status) {
  const usage = getUsage()
  usage.lastTest = { provider, status, timestamp: Date.now() }
  saveUsage(usage)
}

export function callsCount(usage = getUsage()) {
  return usage.calls.length
}

export function callsToday(usage = getUsage()) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  return usage.calls.filter((c) => c.timestamp >= start.getTime()).length
}

export function callsByType(usage = getUsage()) {
  const counts = {}
  for (const c of usage.calls) counts[c.type] = (counts[c.type] ?? 0) + 1
  return counts
}