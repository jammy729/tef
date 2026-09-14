import { useCallback, useEffect, useRef, useState } from 'react'
import { tutorRequest } from '../lib/llm'
import { speakFrench } from '../lib/audio'
import { TASK_A_SCENARIOS, TASK_B_SCENARIOS } from '../content/scenarios'

function findScenario(list, scenarioId) {
  return list.find((s) => s.id === scenarioId) ?? null
}

// Local, canned French greetings — spoken immediately on call start rather than waiting on an
// LLM round trip, so the learner is never dropped into dead silence (spec §3.1). Task A/mock and
// Task B greetings name the actual scenario so the learner knows what they're walking into.
function greetingFor(mode, scenarioId) {
  if (mode === 'taskA' || mode === 'mock') {
    const scenario = findScenario(TASK_A_SCENARIOS, scenarioId) ?? TASK_A_SCENARIOS[0]
    return `Bonjour ! Je suis Camille. Aujourd'hui : ${scenario.fr} Vas-y, commence quand tu es prêt.`
  }
  if (mode === 'taskB') {
    const scenario = findScenario(TASK_B_SCENARIOS, scenarioId) ?? TASK_B_SCENARIOS[0]
    return `Bonjour ! Je suis Camille. Aujourd'hui, on débat : « ${scenario.fr} » Donne-moi ton opinion.`
  }
  return "Bonjour ! Je suis Camille, ta tutrice de français. De quoi veux-tu parler aujourd'hui ?"
}

// ponytail: fixed guess at trailing speaker echo, not measured per-device — raise if false
// self-replies persist on a given setup (Bluetooth headsets can lag more than this).
const ECHO_GUARD_MS = 600

const SpeechRecognitionCtor =
  typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
const speechSynthesisSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

// Wraps SpeechRecognition + speechSynthesis so the rest of the app never touches the raw
// browser APIs directly (spec §5) — unsupported browsers get one clear signal via `supported`.
// `callConfig` ({ topic, mode, scenarioId }, all optional) themes the tutor's system prompt
// server-side (api/tutor.js TOPIC_LABELS/TASK_A_SCENARIOS/TASK_B_SCENARIOS) — mode defaults to
// "free" when omitted. `locale` controls the language of a correction's instructional `reason`/
// `rule` text only — the French content itself never changes with locale (spec §5).
// `masteredExpressions` (optional, from storage.js getLearnerLearningContext) themes the tutor's
// conversation toward phrases the learner has already mastered in Learn & Practice, without
// gating the call on it (spec §3.2.6).
export function useVoiceCall(callConfig, locale = 'en', masteredExpressions = []) {
  const { topic = null, mode = 'free', scenarioId = null } = callConfig ?? {}
  const supported = Boolean(SpeechRecognitionCtor && speechSynthesisSupported)

  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [waitingForTutor, setWaitingForTutor] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [transcript, setTranscript] = useState([])
  const [corrections, setCorrections] = useState([])
  const [llmError, setLlmError] = useState(null)
  const [endingCall, setEndingCall] = useState(false)
  const [micError, setMicError] = useState(null)

  const recognitionRef = useRef(null)
  const startedAtRef = useRef(Date.now())
  const greetedRef = useRef(false)
  const speakingRef = useRef(false)
  // True while the mic is deliberately stopped for TTS playback (+ its echo tail) — the standard
  // half-duplex pattern for a loudspeaker+mic setup with no real echo cancellation available (the
  // Web Speech API doesn't expose one): the recognizer is actually stopped while Camille talks,
  // not just filtered, so her own voice never reaches it at all. `onend` below checks this flag
  // to skip its normal auto-restart — `speak()` below owns restarting it itself, after the pause.
  const pausedForTtsRef = useRef(false)
  // Whether the mic should be running once any TTS pause ends — true for the whole call, false
  // only after the learner manually stops it or after repeated recognizer failures.
  const shouldListenRef = useRef(true)

  const speak = useCallback(
    (text) =>
      new Promise((resolve) => {
        if (!supported) {
          resolve()
          return
        }
        speakingRef.current = true
        pausedForTtsRef.current = true
        setSpeaking(true)
        try {
          recognitionRef.current?.stop()
        } catch {
          // not running — ignore
        }
        speakFrench(text, {
          onEnd: () => {
            // Give the speaker/Bluetooth output a moment to actually finish before reopening the
            // mic — playback lags a beat past the TTS `onend` event, and reopening immediately
            // just picks that trailing echo back up as if the learner had said it.
            setTimeout(() => {
              pausedForTtsRef.current = false
              speakingRef.current = false
              setSpeaking(false)
              if (shouldListenRef.current) {
                try {
                  recognitionRef.current?.start()
                } catch {
                  // already running — ignore
                }
              }
              resolve()
            }, ECHO_GUARD_MS)
          },
        })
      }),
    [supported],
  )

  const askTutor = useCallback(
    async (nextTranscript) => {
      setLlmError(null)
      setWaitingForTutor(true)
      try {
        const { ok, data } = await tutorRequest({
          type: 'turn',
          transcript: nextTranscript,
          topic,
          mode,
          scenarioId,
          locale,
          masteredExpressions,
        })
        if (!ok) {
          setLlmError(data.error ?? 'llm_unavailable')
          return null
        }
        return { reply: data.reply, correction: data.correction ?? null }
      } catch {
        setLlmError('llm_unavailable')
        return null
      } finally {
        setWaitingForTutor(false)
      }
    },
    [topic, mode, scenarioId, locale, masteredExpressions],
  )

  // Fires whenever the learner's turn lands in the transcript — asks the tutor for its next
  // line, then speaks the reply. Keyed on transcript so it always sees the latest turns.
  useEffect(() => {
    const last = transcript[transcript.length - 1]
    if (!last || last.speaker !== 'learner') return

    let cancelled = false
    askTutor(transcript).then((result) => {
      if (cancelled || !result) return
      setTranscript((prev) => [...prev, { speaker: 'tutor', text: result.reply, ts: Date.now() }])
      if (result.correction) setCorrections((prev) => [...prev, result.correction])
      speak(result.reply)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed intentionally on transcript only
  }, [transcript])

  useEffect(() => {
    if (!supported) return undefined

    shouldListenRef.current = true
    const recognition = new SpeechRecognitionCtor()
    recognition.lang = 'fr-FR'
    recognition.interimResults = true
    recognition.continuous = true

    recognition.onresult = (event) => {
      // The mic is actually stopped (see speak()/pausedForTtsRef) while the tutor is talking, so
      // this fires only for genuine learner audio — speakingRef is checked anyway as a cheap
      // belt-and-suspenders guard against any results still in flight from the moment stop() was
      // called.
      if (speakingRef.current) return
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          const text = result[0].transcript.trim()
          if (text) setTranscript((prev) => [...prev, { speaker: 'learner', text, ts: Date.now() }])
          setInterimText('')
        } else {
          interim += result[0].transcript
        }
      }
      if (interim) setInterimText(interim)
    }

    // React 18 StrictMode double-invokes this effect in dev: a first `recognition` instance is
    // created, started, then torn down by the cleanup below, before a second replaces it in
    // recognitionRef. The first instance's `stop()` fires its `onend` asynchronously, arriving
    // *after* the second instance already exists — without this check, that stale `onend` would
    // restart the old, superseded instance too, leaving two `SpeechRecognition` objects fighting
    // over the same mic and endlessly stopping/restarting each other.
    const isCurrent = () => recognitionRef.current === recognition
    let restartTimer = null
    let consecutiveFailures = 0

    recognition.onstart = () => {
      if (!isCurrent()) return
      consecutiveFailures = 0
      setListening(true)
    }
    // Browsers stop `continuous` recognition on their own after a period of silence or a
    // transient error — restart it so the mic stays on for the whole call, like a real
    // phone line, instead of the learner having to re-tap it every turn. Restarting is
    // debounced: if the mic has no real audio backend (or the browser keeps rejecting the
    // session), start()/onend can otherwise fire back-to-back hundreds of times a second —
    // the mic status visibly strobing on/off — so back off after repeated failures instead of
    // hammering start() in a tight loop.
    recognition.onend = () => {
      if (!isCurrent()) return
      setListening(false)
      // A deliberate pause for TTS playback — speak() owns restarting the recognizer itself
      // once playback (plus its echo tail) has actually finished, not this auto-restart.
      if (pausedForTtsRef.current) return
      if (!shouldListenRef.current) return
      consecutiveFailures += 1
      if (consecutiveFailures > 5) {
        shouldListenRef.current = false
        setMicError('audio-capture')
        return
      }
      restartTimer = setTimeout(() => {
        if (!isCurrent() || !shouldListenRef.current) return
        try {
          recognition.start()
        } catch {
          // already starting/started — ignore
        }
      }, 300)
    }
    recognition.onerror = (event) => {
      if (!isCurrent()) return
      setMicError(event.error)
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        shouldListenRef.current = false
      }
    }

    recognitionRef.current = recognition
    // The mic runs for the whole call (spec §3.1.1), not just while the learner has the floor.
    // Deferred by a tick (not called synchronously here) so React 18 StrictMode's dev-only
    // double-invoke doesn't actually touch mic hardware twice: the phantom first instance's
    // cleanup below cancels this timer before it ever calls start(), so only the real, second
    // instance's start() fires. Calling start()/stop() back-to-back on the same instance was
    // otherwise observed (Chrome/macOS) to leave the mic silently deaf — onstart still fires
    // (mic indicator shows "listening") but no audio is ever actually captured, so speech in
    // any language just vanishes with no error.
    const startTimer = setTimeout(() => {
      if (!isCurrent()) return
      try {
        recognition.start()
      } catch {
        // already running — ignore
      }
    }, 0)

    return () => {
      shouldListenRef.current = false
      clearTimeout(startTimer)
      if (restartTimer) clearTimeout(restartTimer)
      recognition.stop()
    }
  }, [supported])

  const startListening = useCallback(() => {
    if (!supported || !recognitionRef.current) return
    shouldListenRef.current = true
    setMicError(null)
    try {
      recognitionRef.current.start()
    } catch {
      // already running — ignore
    }
  }, [supported])

  const stopListening = useCallback(() => {
    if (!supported || !recognitionRef.current) return
    shouldListenRef.current = false
    recognitionRef.current.stop()
  }, [supported])

  // Opens the call with a mode-aware spoken greeting instead of dead silence (spec §3.1). The
  // mic itself is started separately, by the recognition-setup effect above.
  // Guarded against firing twice — React 18 StrictMode double-invokes mount effects in dev.
  const greet = useCallback(() => {
    if (greetedRef.current) return
    greetedRef.current = true
    const text = greetingFor(mode, scenarioId)
    setTranscript((prev) => [...prev, { speaker: 'tutor', text, ts: Date.now() }])
    speak(text)
  }, [mode, scenarioId, speak])

  // Stops the mic, requests a final rubric score for the whole transcript, and returns a
  // session payload ready to persist (src/lib/storage.js addSession). Returns `null` on
  // LLM failure — caller should still let the learner leave the call.
  const endCall = useCallback(async () => {
    if (listening) stopListening()
    setEndingCall(true)
    const durationSec = Math.round((Date.now() - startedAtRef.current) / 1000)
    try {
      const { ok, data } = await tutorRequest({ type: 'score', transcript })
      if (!ok) {
        setLlmError(data.error ?? 'llm_unavailable')
        return null
      }
      return {
        mode: mode !== 'free' ? mode : (topic ?? 'free'),
        scenarioId,
        startedAt: startedAtRef.current,
        durationSec,
        transcript,
        corrections,
        scores: data.scores,
        focusAreas: data.focusAreas ?? [],
        strengths: data.strengths ?? [],
        vocabSuggestions: data.vocabSuggestions ?? [],
      }
    } catch {
      setLlmError('llm_unavailable')
      return null
    } finally {
      setEndingCall(false)
    }
  }, [listening, stopListening, transcript, corrections, topic, mode, scenarioId])

  return {
    supported,
    listening,
    speaking,
    waitingForTutor,
    endingCall,
    interimText,
    transcript,
    corrections,
    llmError,
    micError,
    greet,
    startListening,
    stopListening,
    endCall,
  }
}
