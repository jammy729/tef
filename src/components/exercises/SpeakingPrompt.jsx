import { useRef, useState } from 'react'
import { Mic, Square, Volume2 } from 'lucide-react'
import { Button } from '../ui/button'
import { speakFrench } from '../../lib/audio'
import { useLocale } from '../../lib/i18n/LocaleContext'

const SpeechRecognitionCtor =
  typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)

// Speaking practice for "pronunciation" exercises (spec §3.2.2) — the learner reads the target
// sentence aloud instead of tapping tiles. One attempt per tap: SpeechRecognition listens until
// silence, the transcript becomes `given` (same wiring ChoiceBank/TileBuilder already use), and
// ExerciseRunner's existing Check/Try again flow evaluates it — no new flow, just a new input.
export default function SpeakingPrompt({ content, disabled, onChange }) {
  const { t } = useLocale()
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [said, setSaid] = useState('')
  const [micError, setMicError] = useState(null)
  const recognitionRef = useRef(null)

  const supported = Boolean(SpeechRecognitionCtor)

  const startListening = () => {
    if (!supported || disabled || listening) return
    setMicError(null)
    setInterim('')
    const recognition = new SpeechRecognitionCtor()
    recognition.lang = 'fr-FR'
    recognition.interimResults = true
    recognition.continuous = false
    recognition.onresult = (event) => {
      let text = ''
      let isFinal = false
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript
        if (event.results[i].isFinal) isFinal = true
      }
      if (isFinal) {
        setSaid(text.trim())
        onChange(text.trim())
        setInterim('')
      } else {
        setInterim(text)
      }
    }
    recognition.onerror = (event) => setMicError(event.error)
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  // `continuous: false` auto-stops on a detected silence, but that can take a while (or never
  // fire in a noisy room) — let the learner tap the mic again to end the attempt manually too.
  const stopListening = () => {
    if (!listening) return
    recognitionRef.current?.stop()
  }

  if (!supported) {
    return <p className="mt-4 text-sm text-destructive">{t('exercise.speakingUnsupported')}</p>
  }

  return (
    <div className="mt-4 flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-5 text-center">
      <button
        type="button"
        onClick={() => speakFrench(content.sentence)}
        className="flex items-center gap-1.5 rounded hover:bg-accent hover:text-primary"
        aria-label={t('exercise.hearSentence')}
      >
        <Volume2 className="size-4 text-primary" />
        <span className="font-serif text-lg leading-relaxed">{content.sentence}</span>
      </button>

      <Button
        type="button"
        variant={listening ? 'destructive' : 'default'}
        size="icon-lg"
        className="rounded-full"
        disabled={disabled}
        onClick={listening ? stopListening : startListening}
        aria-label={listening ? t('exercise.stopButton') : t('exercise.recordButton')}
      >
        {listening ? <Square /> : <Mic />}
      </Button>

      {listening && (
        <p className="text-sm text-muted-foreground">{interim || t('exercise.listening')}</p>
      )}
      {!listening && said && (
        <p className="text-sm text-muted-foreground">{t('exercise.youSaid', { said })}</p>
      )}
      {micError && (
        <p role="alert" className="text-xs text-destructive">
          {t('exercise.micError')}
        </p>
      )}
    </div>
  )
}
