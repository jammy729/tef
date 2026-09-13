import { useState } from 'react'
import { Check, Flame, Lock, Sparkles } from 'lucide-react'
import AppSidebar from './AppSidebar'
import ExerciseRunner from './ExerciseRunner'
import { Button } from './ui/button'
import { cn } from '../lib/utils'
import { useLocale } from '../lib/i18n/LocaleContext'
import { useProfile } from '../lib/profiles'
import { COURSE, getAllUnits, getReviewExercises } from '../content/course'
import { importGeneratedUnit } from '../lib/learningEngine/importGeneratedUnit'
import { addGeneratedUnit } from '../lib/generatedContent'
import { getDueReviewItems, getLessonProgressMap, getStreakDays } from '../lib/storage'
import { llmErrorKey } from '../lib/errors'

// The learning path (spec §3.3) — units/lessons with locked/unlocked/done state, a "continue
// learning" shortcut, and the daily-practice/review-queue entry point. A router isn't part of
// this app's architecture (spec §5), so /learn, /learn/:lessonId etc. from the original proposal
// become view-state navigation like every other screen, not URL routes.
export default function LearnScreen({ active, onNavigate }) {
  const { t } = useLocale()
  const { profile } = useProfile()
  const [reviewing, setReviewing] = useState(false)
  const [reviewResult, setReviewResult] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState(null)

  const lessonProgress = getLessonProgressMap(profile.id)
  const dueItems = getDueReviewItems(profile.id)
  const streak = getStreakDays(profile.id)

  const units = getAllUnits()

  const unitSections = units.reduce((acc, unit) => {
    const priorUnitDone = acc.length === 0 || acc[acc.length - 1].lessonRows.every((r) => r.status === 'done')
    const lessonRows = unit.lessons.map((lesson, i) => {
      const status = lessonProgress[lesson.id] ?? 'not_started'
      const prevDone = i === 0 ? priorUnitDone : (lessonProgress[unit.lessons[i - 1].id] ?? 'not_started') === 'done'
      const locked = !prevDone && status !== 'done'
      return { lesson, status, locked }
    })
    acc.push({ unit, lessonRows, doneCount: lessonRows.filter((r) => r.status === 'done').length })
    return acc
  }, [])
  const nextLesson = unitSections.flatMap((s) => s.lessonRows).find((r) => r.status !== 'done' && !r.locked)?.lesson ?? null

  const generateUnit = async () => {
    setGenerating(true)
    setGenerateError(null)
    try {
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'generateUnit',
          level: COURSE.levels[0].id,
          existingTopics: units.map((u) => u.title),
          locale: profile.locale ?? 'en',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.error || !data.unit) {
        setGenerateError(data.error ?? 'llm_unavailable')
        return
      }
      const { unit, items } = importGeneratedUnit(crypto.randomUUID(), data.unit, data.items ?? {})
      addGeneratedUnit(unit, items)
    } catch {
      setGenerateError('llm_unavailable')
    } finally {
      setGenerating(false)
    }
  }

  if (reviewing) {
    const exercises = getReviewExercises(dueItems.map((d) => d.itemId))
    return (
      <div className="flex min-h-svh w-full bg-background">
        <AppSidebar active={active} onNavigate={onNavigate} />
        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <header className="border-b border-border px-6 py-5 md:px-10">
            <h1 className="text-h1 text-xl">{t('learn.review.title')}</h1>
          </header>
          <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-6 md:p-10">
            {reviewResult ? (
              <div className="rounded-xl border border-border bg-card px-6 py-6 text-center">
                <p className="text-2xl">🎉</p>
                <p className="mt-2 text-sm font-medium">
                  {t('learn.review.complete', { correct: reviewResult.correct, total: reviewResult.total })}
                </p>
                <Button
                  className="mt-4"
                  onClick={() => {
                    setReviewing(false)
                    setReviewResult(null)
                  }}
                >
                  {t('learn.review.backButton')}
                </Button>
              </div>
            ) : exercises.length > 0 ? (
              <ExerciseRunner exercises={exercises} onComplete={setReviewResult} />
            ) : (
              <p className="text-sm text-muted-foreground">{t('learn.dailyPractice.empty')}</p>
            )}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh w-full bg-background">
      <AppSidebar active={active} onNavigate={onNavigate} />

      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="border-b border-border px-6 py-5 md:px-10">
          <h1 className="text-h1 text-xl">{t('learn.header.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('learn.header.subtitle')}</p>
        </header>

        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6 md:p-10">
          <div className="rounded-xl bg-sidebar-dark px-5 py-4 text-sidebar-dark-foreground">
            <p className="label-caps flex items-center gap-1.5 text-primary">
              <Flame className="size-3.5" /> {t('learn.dailyPractice.title')}
            </p>
            <p className="mt-1.5 text-sm text-sidebar-dark-foreground/80">
              {t('learn.dailyPractice.streak', { n: streak })} ·{' '}
              {dueItems.length > 0 ? t('learn.dailyPractice.dueCount', { n: dueItems.length }) : t('learn.dailyPractice.empty')}
            </p>
            {dueItems.length > 0 && (
              <Button size="sm" variant="soft" className="mt-3" onClick={() => setReviewing(true)}>
                {t('learn.dailyPractice.startButton')}
              </Button>
            )}
          </div>

          {nextLesson && (
            <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-card px-5 py-4">
              <div>
                <p className="label-caps text-primary">{t('learn.continue')}</p>
                <p className="mt-1 font-serif text-lg font-semibold">{nextLesson.title}</p>
              </div>
              <Button onClick={() => onNavigate('lesson', nextLesson.id)}>{t('learn.continue')}</Button>
            </div>
          )}

          {unitSections.map(({ unit, lessonRows, doneCount }) => (
            <section key={unit.id}>
              <div className="flex items-baseline justify-between">
                <h2 className="text-h2">{unit.title}</h2>
                <span className="text-sm text-muted-foreground">
                  {t('learn.unit.progress', { done: doneCount, total: unit.lessons.length })}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{unit.description}</p>

              <div className="mt-4 flex flex-col gap-2">
                {lessonRows.map(({ lesson, status, locked }) => (
                  <button
                    key={lesson.id}
                    type="button"
                    disabled={locked}
                    onClick={() => onNavigate('lesson', lesson.id)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
                      locked
                        ? 'cursor-not-allowed border-border bg-muted/50 opacity-60'
                        : 'border-border bg-card hover:bg-muted',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-7 shrink-0 items-center justify-center rounded-full text-xs',
                        status === 'done' ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {status === 'done' ? <Check className="size-3.5" /> : locked ? <Lock className="size-3.5" /> : null}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{lesson.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {locked
                          ? t('learn.lesson.locked')
                          : status === 'done'
                            ? t('learn.lesson.done')
                            : t('learn.lesson.notStarted')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))}

          <div className="rounded-xl border border-dashed border-border px-5 py-4 text-center">
            <Button variant="secondary" onClick={generateUnit} disabled={generating}>
              <Sparkles className="size-4" /> {generating ? t('learn.generateUnit.loading') : t('learn.generateUnit.button')}
            </Button>
            {generateError && (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {t(llmErrorKey(generateError))}
              </p>
            )}
          </div>

          <p className="text-xs text-muted-foreground">{t('learn.quotaNotice')}</p>
        </div>
      </main>
    </div>
  )
}
