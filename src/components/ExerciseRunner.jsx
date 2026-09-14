import { useEffect, useState } from 'react'
import { Check, Lightbulb, Volume2 } from 'lucide-react'
import { Button } from './ui/button'
import ChoiceBank from './exercises/ChoiceBank'
import SpeakingPrompt from './exercises/SpeakingPrompt'
import { useLocale } from '../lib/i18n/LocaleContext'
import { useProfile } from '../lib/profiles'
import { evaluateExercise } from '../lib/learningEngine/evaluate'
import { recordAttempt } from '../lib/storage'
import { learningItem } from '../content/course'
import { speak, speakFrench, playCorrectSound, playIncorrectSound } from '../lib/audio'
import { cn } from '../lib/utils'

// The French word/phrase an exercise is actually testing recognition of — only meaningful (and
// safe to reveal) for multiple_choice items built on a vocabulary/phrase LearningItem, where the
// French term is the stimulus and the options are English meanings. Other exercise types test
// recall in the other direction (English → French) or already show their French content directly
// (fill_blank's content.sentence), so surfacing "the French word" there would just hand over the
// answer — those keep the plain instructional prompt.
function frenchTermFor(exercise) {
  if (exercise.type !== 'multiple_choice') return null
  const item = learningItem(exercise.learningItemId)
  if (item?.type === 'vocabulary') return item.word
  if (item?.type === 'phrase') return item.phrase
  return null
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Steps through a list of exercises one at a time — reused by a lesson's practice stage and by
// review sessions (spec §3.2). Every exercise is answered by tapping a word-bank chip or, for
// "pronunciation" exercises, speaking the target sentence — never typed text — and evaluated
// synchronously, client-side, no LLM call in this flow. Records mastery/review-schedule updates
// as it goes (src/lib/storage.js recordAttempt), so leaving mid-session doesn't lose progress.
export default function ExerciseRunner({ exercises, onComplete }) {
  const { t } = useLocale()
  const { profile } = useProfile()

  // Shuffled once per session (not on every render) so the same lesson/review/quiz doesn't always
  // walk exercises in the same authored order.
  const [shuffled] = useState(() => shuffle(exercises))
  const [index, setIndex] = useState(0)
  const [given, setGiven] = useState('')
  const [feedback, setFeedback] = useState(null) // { correct, message } | null
  const [hintsShown, setHintsShown] = useState(0)
  const [results, setResults] = useState([]) // { correct } per exercise, in order

  const exercise = shuffled[index]
  const isLast = index === shuffled.length - 1
  const frenchTerm = frenchTermFor(exercise)

  // Reads the question aloud whenever a new exercise loads, so the learner practices listening
  // as well as reading — same browser-native TTS as the Call feature (spec §5), no LLM call. A
  // resolvable French term is read with a French voice; otherwise the plain instructional prompt
  // is read with no language forced (see frenchTermFor above for why).
  useEffect(() => {
    if (frenchTerm) speakFrench(frenchTerm)
    else speak(exercise.prompt)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once per exercise, keyed by id
  }, [exercise.id])

  const advance = (correct) => {
    const nextResults = [...results, { correct }]
    setResults(nextResults)
    if (isLast) {
      onComplete({ total: shuffled.length, correct: nextResults.filter((r) => r.correct).length })
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
    if (correct) playCorrectSound()
    else playIncorrectSound()
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
          {t('exercise.progress', { current: index + 1, total: shuffled.length })}
        </p>
        <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted">
          <div
            className="h-1.5 rounded-full bg-primary transition-all"
            style={{ width: `${((index + (feedback ? 1 : 0)) / shuffled.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card px-5 py-5">
        {frenchTerm ? (
          <button
            type="button"
            onClick={() => speakFrench(frenchTerm)}
            aria-label={`${frenchTerm} — hear again`}
            className="flex items-center gap-1.5 rounded hover:bg-accent hover:text-primary"
          >
            <Volume2 className="size-4 shrink-0 text-primary" />
            <span className="font-serif text-lg font-semibold leading-relaxed">{frenchTerm}</span>
          </button>
        ) : (
          <p className="text-sm font-medium">{exercise.prompt}</p>
        )}

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

        {exercise.type === 'pronunciation' && (
          <SpeakingPrompt
            key={exercise.id}
            content={exercise.content}
            disabled={Boolean(feedback)}
            onChange={setGiven}
          />
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
