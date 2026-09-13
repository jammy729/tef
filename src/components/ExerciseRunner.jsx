import { useState } from 'react'
import { Check, Lightbulb } from 'lucide-react'
import { Button } from './ui/button'
import ChoiceBank from './exercises/ChoiceBank'
import TileBuilder from './exercises/TileBuilder'
import { useLocale } from '../lib/i18n/LocaleContext'
import { useProfile } from '../lib/profiles'
import { evaluateExercise } from '../lib/learningEngine/evaluate'
import { recordAttempt } from '../lib/storage'
import { cn } from '../lib/utils'

// Steps through a list of exercises one at a time — reused by a lesson's practice stage and by
// review sessions (spec §3.2). Every exercise is tap-only (multiple choice, a word-bank chip, or
// ordered word tiles) and evaluated synchronously, client-side — no typing, no LLM call in this
// flow. Records mastery/review-schedule updates as it goes (src/lib/storage.js recordAttempt), so
// leaving mid-session doesn't lose progress already made.
export default function ExerciseRunner({ exercises, onComplete }) {
  const { t } = useLocale()
  const { profile } = useProfile()

  const [index, setIndex] = useState(0)
  const [given, setGiven] = useState('')
  const [feedback, setFeedback] = useState(null) // { correct, message } | null
  const [hintsShown, setHintsShown] = useState(0)
  const [results, setResults] = useState([]) // { correct } per exercise, in order

  const exercise = exercises[index]
  const isLast = index === exercises.length - 1

  const advance = (correct) => {
    const nextResults = [...results, { correct }]
    setResults(nextResults)
    if (isLast) {
      onComplete({ total: exercises.length, correct: nextResults.filter((r) => r.correct).length })
      return
    }
    setIndex((i) => i + 1)
    setGiven('')
    setFeedback(null)
    setHintsShown(0)
  }

  const check = () => {
    const correct = evaluateExercise(exercise, given)
    recordAttempt(profile.id, exercise.learningItemId, { correct, hintsUsed: hintsShown > 0, stage: exercise.stage })
    setFeedback({ correct, message: exercise.explanation })
  }

  const retry = () => {
    setFeedback(null)
    setGiven('')
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs text-muted-foreground">
          {t('exercise.progress', { current: index + 1, total: exercises.length })}
        </p>
        <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted">
          <div
            className="h-1.5 rounded-full bg-primary transition-all"
            style={{ width: `${((index + (feedback ? 1 : 0)) / exercises.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card px-5 py-5">
        <p className="text-sm font-medium">{exercise.prompt}</p>

        {(exercise.type === 'multiple_choice' || exercise.type === 'fill_blank' || exercise.type === 'translation') && (
          <div className="mt-4">
            {exercise.content.sentence && (
              <p className="mb-3 font-serif text-lg leading-relaxed">{exercise.content.sentence}</p>
            )}
            <ChoiceBank
              options={exercise.content.options}
              selected={given}
              disabled={Boolean(feedback)}
              onSelect={setGiven}
            />
          </div>
        )}

        {exercise.type === 'production' && (
          <div className="mt-4">
            <TileBuilder
              key={exercise.id}
              tiles={exercise.content.tiles}
              disabled={Boolean(feedback)}
              onChange={setGiven}
            />
          </div>
        )}

        {exercise.hints?.length > 0 && !feedback && (
          <div className="mt-3">
            {hintsShown < exercise.hints.length && (
              <button
                type="button"
                onClick={() => setHintsShown((h) => h + 1)}
                className="flex items-center gap-1 text-xs font-medium text-primary underline underline-offset-2"
              >
                <Lightbulb className="size-3.5" /> {t('exercise.hint')}
              </button>
            )}
            {exercise.hints.slice(0, hintsShown).map((hint, i) => (
              <p key={i} className="mt-1 text-xs text-muted-foreground">
                {hint}
              </p>
            ))}
          </div>
        )}

        {feedback && (
          <div
            className={cn(
              'mt-4 rounded-lg px-3 py-2.5 text-sm',
              feedback.correct ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive',
            )}
          >
            <p className="font-medium">{feedback.correct ? t('exercise.correct') : t('exercise.incorrect')}</p>
            {feedback.message && <p className="mt-1 text-foreground">{feedback.message}</p>}
          </div>
        )}

        <div className="mt-4 flex gap-2">
          {!feedback ? (
            <Button onClick={check} disabled={!given.trim()}>
              <Check /> {t('exercise.checkButton')}
            </Button>
          ) : feedback.correct ? (
            <Button onClick={() => advance(true)}>{isLast ? t('exercise.finish') : t('exercise.continueButton')}</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={retry}>
                {t('exercise.tryAgain')}
              </Button>
              <Button onClick={() => advance(false)}>{isLast ? t('exercise.finish') : t('exercise.continueButton')}</Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
