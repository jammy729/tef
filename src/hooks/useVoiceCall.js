import { useCallback, useEffect, useRef, useState } from 'react'
import { tutorRequest } from '../lib/llm'

const SpeechRecognitionCtor =
  typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
const speechSynthesisSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

function pickFrenchVoice() {
  const voices = window.speechSynthesis.getVoices()
  return (
    voices.find((v) => v.lang === 'fr-FR') ??
    voices.find((v) => v.lang?.startsWith('fr')) ??
    null
  )
}

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
  const [muted, setMuted] = useState(false)
  const [endingCall, setEndingCall] = useState(false)

  const recognitionRef = useRef(null)
  const mutedRef = useRef(false)
  const startedAtRef = useRef(Date.now())

  const toggleMuted = useCallback(() => {
    setMuted((prev) => {
      const next = !prev
      mutedRef.current = next
      if (next && supported) window.speechSynthesis.cancel()
      return next
    })
  }, [supported])

  const speak = useCallback(
    (text) =>
      new Promise((resolve) => {
        if (!supported || mutedRef.current) {
          resolve()
          return
        }
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'fr-FR'
        const voice = pickFrenchVoice()
        if (voice) utterance.voice = voice
        utterance.onend = () => {
          setSpeaking(false)
          resolve()
        }
        utterance.onerror = () => {
          setSpeaking(false)
          resolve()
        }
        setSpeaking(true)
        window.speechSynthesis.speak(utterance)
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

    const recognition = new SpeechRecognitionCtor()
    recognition.lang = 'fr-FR'
    recognition.interimResults = true
    recognition.continuous = true

    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          const text = result[0].transcript.trim()
          if (text) {
            setTranscript((prev) => [...prev, { speaker: 'learner', text, ts: Date.now() }])
          }
          setInterimText('')
        } else {
          interim += result[0].transcript
        }
      }
      if (interim) setInterimText(interim)
    }

    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)

    recognitionRef.current = recognition
    return () => recognition.stop()
  }, [supported])

  const startListening = useCallback(() => {
    if (!supported || listening || speaking) return
    setInterimText('')
    recognitionRef.current.start()
    setListening(true)
  }, [supported, listening, speaking])

  const stopListening = useCallback(() => {
    if (!supported || !listening) return
    recognitionRef.current.stop()
    setListening(false)
  }, [supported, listening])

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
    muted,
    toggleMuted,
    startListening,
    stopListening,
    endCall,
  }
}
