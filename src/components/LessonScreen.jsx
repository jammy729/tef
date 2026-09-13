import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import AppSidebar from './AppSidebar'
import InteractiveText from './InteractiveText'
import ExerciseRunner from './ExerciseRunner'
import { Button } from './ui/button'
import { useLocale } from '../lib/i18n/LocaleContext'
import { useProfile } from '../lib/profiles'
import { getLesson, learningItem } from '../content/course'
import { setLessonStatus } from '../lib/storage'

function LearningItemCard({ item, t }) {
  if (item.type === 'vocabulary') {
    return (
      <div className="rounded-xl border border-border bg-card px-5 py-4">
        <p className="label-caps text-primary">{t('lesson.vocabulary')}</p>
        <p className="mt-1 font-serif text-xl font-semibold">{item.word}</p>
        <p className="text-sm text-muted-foreground">
          {item.meaning} · {item.partOfSpeech}
        </p>
        <div className="mt-2">
          <InteractiveText passage={item.example} />
        </div>
        {item.related?.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {t('lesson.related')}: {item.related.join(', ')}
          </p>
        )}
      </div>
    )
  }
  if (item.type === 'phrase') {
    return (
      <div className="rounded-xl border border-border bg-card px-5 py-4">
        <p className="label-caps text-primary">{t('lesson.expression')}</p>
        <p className="mt-1 font-serif text-xl font-semibold">{item.phrase}</p>
        <p className="text-sm text-muted-foreground">
          {item.meaning} · {item.function}
        </p>
        <div className="mt-2">
          <InteractiveText passage={item.example} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{t('lesson.tefUsage')}: {item.tefUsage}</p>
      </div>
    )
  }
  // grammar
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4">
      <p className="label-caps text-primary">{t('lesson.grammar')}</p>
      <p className="mt-1 font-serif text-xl font-semibold">{item.title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{item.explanation}</p>
      <div className="mt-2 flex flex-col gap-1">
        {item.examples.map((ex) => (
          <InteractiveText key={ex} passage={ex} />
        ))}
      </div>
    </div>
  )
}

// The 4-stage lesson flow (spec §3.3): Learn (introduce learning items) → Practice (ExerciseRunner)
// → Complete (accuracy + mastery summary). Learning logic itself lives in src/lib/learningEngine/
// and src/lib/storage.js — this component only renders state and collects input.
export default function LessonScreen({ active, onNavigate, lessonId }) {
  const { t } = useLocale()
  const { profile } = useProfile()
  const lesson = getLesson(lessonId)
  const [stage, setStage] = useState('learn')
  const [result, setResult] = useState(null)

  if (!lesson) {
    return (
      <div className="flex min-h-svh w-full bg-background">
        <AppSidebar active={active} onNavigate={onNavigate} />
        <main className="flex flex-1 items-center justify-center">
          <Button variant="ghost" onClick={() => onNavigate('learn')}>
            <ArrowLeft /> {t('lesson.backButton')}
          </Button>
        </main>
      </div>
    )
  }

  const items = lesson.learningItemIds.map(learningItem).filter(Boolean)

  const handleComplete = ({ total, correct }) => {
    setLessonStatus(profile.id, lesson.id, 'done')
    setResult({ total, correct })
    setStage('complete')
  }

  return (
    <div className="flex min-h-svh w-full bg-background">
      <AppSidebar active={active} onNavigate={onNavigate} />

      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="flex items-center gap-3 border-b border-border px-6 py-5 md:px-10">
          <Button variant="ghost" size="icon-sm" aria-label={t('lesson.backButton')} onClick={() => onNavigate('learn')}>
            <ArrowLeft />
          </Button>
          <div>
            <h1 className="text-h1 text-xl">{lesson.title}</h1>
            <p className="text-sm text-muted-foreground">
              {stage === 'learn' ? t('lesson.stage.learn') : stage === 'practice' ? t('lesson.stage.practice') : t('lesson.complete.title')}
            </p>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-6 md:p-10">
          {stage === 'learn' && (
            <>
              <div className="flex flex-col gap-3">
                {items.map((item) => (
                  <LearningItemCard key={item.id} item={item} t={t} />
                ))}
              </div>
              <Button onClick={() => setStage('practice')}>{t('lesson.startPractice')}</Button>
            </>
          )}

          {stage === 'practice' && <ExerciseRunner exercises={lesson.exercises} onComplete={handleComplete} />}

          {stage === 'complete' && result && (
            <div className="rounded-xl border border-border bg-card px-6 py-6 text-center">
              <p className="text-2xl">🎉</p>
              <h2 className="mt-2 text-h2">{t('lesson.complete.title')}</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted px-4 py-3">
                  <p className="label-caps">{t('lesson.complete.accuracy')}</p>
                  <p className="mt-1 font-serif text-2xl font-semibold text-primary">
                    {Math.round((result.correct / result.total) * 100)}%
                  </p>
                </div>
                <div className="rounded-lg bg-muted px-4 py-3">
                  <p className="label-caps">{t('lesson.complete.newItems')}</p>
                  <p className="mt-1 font-serif text-2xl font-semibold text-primary">{items.length}</p>
                </div>
              </div>
              <Button className="mt-5" onClick={() => onNavigate('learn')}>
                {t('lesson.complete.continueButton')}
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
