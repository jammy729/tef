import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from './ui/button'
import ExerciseRunner from './ExerciseRunner'
import { useLocale } from '../lib/i18n/LocaleContext'
import { tutorRequest } from '../lib/llm'
import { llmErrorKey } from '../lib/errors'

// "Practice more" on a single Learn & Practice item (spec §3.2/§3.3) — an on-demand LLM-generated
// batch of fresh exercises for just this vocabulary word/expression/grammar point, run through the
// same ExerciseRunner as lesson practice and review, so attempts count toward mastery the same way
// (unlike the ephemeral, not-recorded MistakeDrill).
export default function ItemPractice({ item }) {
  const { t, locale } = useLocale()
  const [state, setState] = useState('idle') // idle | loading | error | ready | done
  const [exercises, setExercises] = useState(null)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const term = item.word ?? item.phrase ?? item.title
  const meaning = item.meaning ?? item.explanation ?? ''
  // When present, lets the generated exercises spread across the word's different grammatical
  // forms (spec §3.2.1) instead of only ever testing the base form.
  const variants = item.conjugation ?? item.agreement ?? null

  const generate = async () => {
    setState('loading')
    setError(null)
    const { ok, data } = await tutorRequest({
      type: 'itemDrill',
      learningItemId: item.id,
      term,
      meaning,
      level: item.level,
      locale,
      variants,
    })
    if (!ok || !data.exercises?.length) {
      setError(data.error ?? 'llm_unavailable')
      setState('error')
      return
    }
    setExercises(data.exercises)
    setState('ready')
  }

  if (state === 'ready') {
    return (
      <div className="mt-3">
        <ExerciseRunner exercises={exercises} onComplete={(r) => { setResult(r); setState('done') }} />
      </div>
    )
  }

  if (state === 'done') {
    return (
      <div className="mt-3 rounded-lg bg-muted px-3 py-2.5 text-sm">
        <p className="font-medium">
          {t('lesson.practiceMore.done', { correct: result.correct, total: result.total })}
        </p>
        <Button size="sm" variant="secondary" className="mt-2" onClick={generate}>
          {t('lesson.practiceMore.again')}
        </Button>
      </div>
    )
  }

  return (
    <div className="mt-3">
      <Button size="sm" variant="outline" onClick={generate} disabled={state === 'loading'}>
        {state === 'loading' ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
        {t('lesson.practiceMore.button')}
      </Button>
      {state === 'error' && (
        <p role="alert" className="mt-1.5 text-xs text-destructive">
          {t(llmErrorKey(error))}
        </p>
      )}
    </div>
  )
}
