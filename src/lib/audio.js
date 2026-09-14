// Shared speech/sound-effect helpers — browser-native only (Web Speech API + Web Audio API), no
// new dependency and no audio assets to host (spec §5's "voice is entirely browser-native" rule
// extends naturally to these small UI cues).

import { getSettings } from './settings'

// The Web Speech API exposes no `.gender` on a voice, so "male"/"female" in Settings is a
// name-based heuristic over whatever voices the browser/OS ships — most reliable on Edge/Windows
// and macOS (distinct named voices per gender) and weakest on plain Chrome, which often ships
// only one French voice, in which case the gender preference is a no-op. Matched with `\b` word
// boundaries, not plain substring, since e.g. "female" itself contains "male" as a substring.
// ponytail: upgrade to a curated per-platform voice list if this heuristic still misses names.
const FEMALE_NAMES = ['amélie', 'amelie', 'audrey', 'aurélie', 'aurelie', 'céline', 'celine', 'chantal', 'charlotte', 'chloé', 'chloe', 'denise', 'éloïse', 'eloise', 'emma', 'flo', 'grandma', 'hortense', 'josephine', 'joséphine', 'julie', 'léa', 'lea', 'marie', 'sandy', 'shelley', 'virginie', 'female', 'femme']
const MALE_NAMES = ['thomas', 'paul', 'henri', 'nicolas', 'daniel', 'antoine', 'eddy', 'grandpa', 'guillaume', 'jacques', 'jean', 'reed', 'rocko', 'xavier', 'yannick', 'male', 'homme']

function nameMatches(name, hints) {
  return hints.some((h) => new RegExp(`\\b${h}\\b`, 'i').test(name))
}

function voiceGender(voice) {
  if (nameMatches(voice.name, FEMALE_NAMES)) return 'female'
  if (nameMatches(voice.name, MALE_NAMES)) return 'male'
  return null
}

// Waits for the async voice list to actually load — `getVoices()` often returns empty on the
// very first call after a page load (Chrome loads voices asynchronously), which otherwise picks
// no voice at all for the first utterance and falls back to the browser's raw default. One
// shared promise so every early caller waits on the same load instead of racing separate ones.
let voicesReady = null
function waitForVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return Promise.resolve([])
  const existing = window.speechSynthesis.getVoices()
  if (existing.length) return Promise.resolve(existing)
  voicesReady ??= new Promise((resolve) => {
    const done = () => resolve(window.speechSynthesis.getVoices())
    window.speechSynthesis.addEventListener('voiceschanged', done, { once: true })
    setTimeout(done, 1000) // some browsers never fire voiceschanged — don't hang forever
  })
  return voicesReady
}

// Re-resolved fresh for every utterance (not cached across a whole speakSegments() call) — Chrome
// has a known bug where a SpeechSynthesisVoice object silently stops being honored if it isn't
// from the *latest* getVoices() call, which otherwise shows up as "the voice sounds different/
// wrong partway through a longer greeting."
function pickFrenchVoice(genderPref) {
  const voices = window.speechSynthesis.getVoices()
  const french = voices.filter((v) => v.lang === 'fr-FR' || v.lang?.startsWith('fr'))
  if (!french.length) return null

  const matched = french.filter((v) => voiceGender(v) === genderPref)
  if (matched.length) {
    // Prefer a non-local (cloud/network) voice when there's a choice within the gender-matched
    // set — these are near-universally higher-quality/more natural than on-device fallback
    // voices. Never widen this preference to the *whole* French voice pool: doing so previously
    // meant that whenever neither gender had a recognized name, both settings silently converged
    // on the same single non-local voice, making the Male/Female toggle a no-op.
    return matched.find((v) => v.localService === false) ?? matched.find((v) => v.lang === 'fr-FR') ?? matched[0]
  }

  // No named voice matched either gender on this platform (common on Chrome, which often ships
  // only one generic "Google français"). Fall back to a stable split of whatever French voices
  // exist, by name order, so the Male/Female toggle still audibly changes something instead of
  // silently no-op'ing to the same voice regardless of the setting.
  const sorted = [...french].sort((a, b) => a.name.localeCompare(b.name))
  return genderPref === 'male' ? sorted[sorted.length - 1] : sorted[0]
}

// Pause after each segment, keyed by the punctuation it ended on — longer after a sentence
// boundary than after a comma, so speech reads with real cadence instead of a flat monotone run.
const PAUSE_MS = { ',': 150, ';': 220, ':': 220, '.': 380, '!': 380, '?': 380 }
const DEFAULT_PAUSE_MS = 60

// Splits on punctuation while keeping it attached to the segment it closes — the Web Speech API
// takes plain text (no SSML/break tags), so deliberate pauses have to be inserted between
// separately-spoken chunks rather than embedded in one utterance.
function splitIntoSegments(text) {
  return (text.match(/[^,;:.!?]+[,;:.!?]?/g) ?? [text]).map((s) => s.trim()).filter(Boolean)
}

// Cancelling in-flight speech (mute, a new utterance interrupting an old one) only stops the
// *current* browser utterance — our own chained segments are scheduled via setTimeout/onend, so
// stopSpeaking() also bumps this generation counter and every in-flight chain checks it before
// continuing, so a stale chain quietly stops instead of talking over the new one.
let generation = 0

export function stopSpeaking() {
  generation++
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
}

// `lookupVoice` is called fresh for every segment (see pickFrenchVoice's comment above) rather
// than resolved once for the whole call.
async function speakSegments(text, { lang, lookupVoice, rate, onEnd }) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onEnd?.()
    return
  }
  const myGeneration = ++generation
  await waitForVoices()
  if (myGeneration !== generation) {
    onEnd?.()
    return
  }
  const segments = splitIntoSegments(text)
  let i = 0

  function next() {
    if (myGeneration !== generation) {
      onEnd?.()
      return
    }
    if (i >= segments.length) {
      onEnd?.()
      return
    }
    const segment = segments[i]
    const utterance = new SpeechSynthesisUtterance(segment)
    if (lang) utterance.lang = lang
    const voice = lookupVoice?.()
    if (voice) utterance.voice = voice
    utterance.rate = rate
    const pause = PAUSE_MS[segment[segment.length - 1]] ?? DEFAULT_PAUSE_MS
    const advance = () => {
      i++
      if (myGeneration !== generation) {
        onEnd?.()
        return
      }
      setTimeout(next, pause)
    }
    utterance.onend = advance
    utterance.onerror = advance
    window.speechSynthesis.speak(utterance)
  }

  next()
}

// Speaks known-French content (Call, click-to-hear) with a French voice pinned, and the learner's
// chosen speed/gender from Settings (src/lib/settings.js `voice`) — pass `rate`/`gender`
// explicitly to preview unsaved Settings-screen changes; otherwise defaults to the saved values.
export function speakFrench(text, { onEnd, rate, gender } = {}) {
  const saved = getSettings().voice
  speakSegments(text, {
    lang: 'fr-FR',
    lookupVoice: () => pickFrenchVoice(gender ?? saved.gender),
    rate: rate ?? saved.rate,
    onEnd,
  })
}

// Speaks exercise prompts, which are authored as plain instructional text (English today,
// regardless of app locale — see src/content/units/*.js) — no language/voice forced, so the
// browser's default voice picks a sensible pronunciation rather than reading English through a
// French voice. Still honors the learner's chosen speed.
export function speak(text, { rate } = {}) {
  speakSegments(text, { rate: rate ?? getSettings().voice.rate })
}

// ponytail: a synthesized two-tone "ding" via Web Audio (no audio asset to source/host/license).
// One shared AudioContext, created lazily on first use (browsers block autoplay before a user
// gesture, and every call site here follows a tap, so this is safe).
let audioCtx = null

function getAudioCtx() {
  if (typeof window === 'undefined' || !(window.AudioContext || window.webkitAudioContext)) return null
  audioCtx ??= new (window.AudioContext || window.webkitAudioContext)()
  return audioCtx
}

export function playCorrectSound() {
  const ctx = getAudioCtx()
  if (!ctx) return
  const now = ctx.currentTime
  ;[880, 1318.5].forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    const start = now + i * 0.09
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.15, start + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25)
    osc.connect(gain).connect(ctx.destination)
    osc.start(start)
    osc.stop(start + 0.25)
  })
}

// A short, low buzz — distinct in both pitch (falling vs. rising) and timbre (sawtooth vs. sine)
// from playCorrectSound, so the two are never confused even without looking at the screen.
export function playIncorrectSound() {
  const ctx = getAudioCtx()
  if (!ctx) return
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(220, now)
  osc.frequency.exponentialRampToValueAtTime(140, now + 0.2)
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(0.12, now + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)
  osc.connect(gain).connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.22)
}
