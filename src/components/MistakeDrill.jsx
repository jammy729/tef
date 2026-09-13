import { useEffect, useState } from 'react'
import { useLocale } from '../lib/i18n/LocaleContext'
import { Button } from './ui/button'
import ChoiceBank from './exercises/ChoiceBank'
import { tutorRequest } from '../lib/llm'
import { llmErrorKey } from '../lib/errors'
import { categoryInfo } from '../lib/rubric'

// "Practice your mistakes" (spec §3.1.4/§3.2.5) — fresh tap-only exercises for one weak category,
// walked one at a time. Ephemeral: not persisted as a session, just supplementary practice on top
// of the Mistake Bank.
export default function MistakeDrill({ category, onClose }) {
  const { t, locale } = useLocale()
  const [exercises, setExercises] = useState(null)
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState(null)
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    tutorRequest({ type: 'drill', category, locale })
      .then(({ ok, data }) => {
        if (cancelled) return
        if (!ok || !data.exercises?.length) {
          setError(data.error ?? 'llm_unavailable')
          return
        }
        setExercises(data.exercises)
      })
    return () => {
      cancelled = true
    }
  }, [category, locale])

  const current = exercises?.[index]
  const categoryLabel = categoryInfo(category).titleKey ? t(categoryInfo(category).titleKey) : category
  const correct = checked && current && answer === current.answer

  const next = () => {
    setAnswer(null)
    setChecked(false)
    setIndex((i) => i + 1)
  }

  return (
    <div className="mt-3 rounded-xl border border-primary/30 bg-card px-4 py-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{t('drill.title', { category: categoryLabel })}</p>
        <button type="button" onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
          {t('drill.close')}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {t(llmErrorKey(error))}
        </p>
      )}
      {!error && !exercises && <p className="mt-2 text-sm text-muted-foreground">{t('drill.loading')}</p>}

      {current && (
        <div className="mt-3">
          <p className="text-xs text-muted-foreground">
            {t('drill.progress', { current: index + 1, total: exercises.length })}
          </p>
          <p className="mt-1 font-serif leading-relaxed">{current.prompt}</p>
          <div className="mt-2">
            <ChoiceBank
              options={current.options}
              selected={answer}
              disabled={checked}
              onSelect={(opt) => {
                setAnswer(opt)
                setChecked(true)
              }}
            />
          </div>
          {checked && correct && <p className="mt-1.5 text-sm text-success">{t('drill.correct')}</p>}
          {checked && !correct && (
            <p className="mt-1.5 text-sm text-destructive">
              {t('drill.incorrect', { answer: current.answer })}
            </p>
          )}
          {checked && index < exercises.length - 1 && (
            <Button size="sm" variant="secondary" className="mt-2" onClick={next}>
              {t('drill.nextButton')}
            </Button>
          )}
          {checked && index === exercises.length - 1 && (
            <p className="mt-3 text-sm font-medium text-success">{t('drill.done')}</p>
          )}
        </div>
      )}
    </div>
  )
}
