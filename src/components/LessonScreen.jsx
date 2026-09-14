import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import AppSidebar from './AppSidebar'
import InteractiveText from './InteractiveText'
import ExerciseRunner from './ExerciseRunner'
import ItemPractice from './ItemPractice'
import LessonAsk from './LessonAsk'
import { Button } from './ui/button'
import { useLocale } from '../lib/i18n/LocaleContext'
import { useProfile } from '../lib/profiles'
import { getLesson, learningItem } from '../content/course'
import { setLessonStatus } from '../lib/storage'
import { speakFrench, stopSpeaking } from '../lib/audio'
import { tutorRequest } from '../lib/llm'

// A conjugation cell may be authored either as a bare verb form ("voudrais") or as the full
// natural phrase including its subject ("J'ai mal à", "Je m'occupe de") where elision or a
// clitic/reflexive pronoun makes the bare form misleading. This detects the full-phrase style so
// it can be rendered and spoken as-is instead of doubling the label ("je J'ai mal à").
const SUBJECT_PREFIXES = ['je ', "j'", 'tu ', "t'", 'il/elle ', 'il ', 'elle ', 'on ', 'nous ', 'vous ', 'ils/elles ', 'ils ', 'elles ']

function startsWithSubject(form) {
  const f = form.toLowerCase().replace('’', "'")
  return SUBJECT_PREFIXES.some((prefix) => f.startsWith(prefix))
}

// A small grid of tap-to-hear French forms — reused for a verb's person conjugation and an
// adjective's gender/number agreement (spec §3.2.1). `label` is app chrome (goes through `t()` by
// the caller for agreement's masculine/feminine/plural labels); French subject pronouns (je/tu/
// il-elle/...) are themselves basic grammar vocabulary and stay raw French regardless of locale.
// Tapping a form speaks the full "label + form" line (or the form alone when it already carries
// its subject), so the learner hears "je voudrais" and "j'ai mal à", not a bare verb fragment.
function FormsGrid({ forms }) {
  return (
    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
      {forms.map(([label, form]) =>
        form ? (
          <button
            key={label}
            type="button"
            onClick={() => speakFrench(startsWithSubject(form) ? form : `${label} ${form}`)}
            aria-label={startsWithSubject(form) ? form : `${label} ${form}`}
            className="flex items-baseline gap-1.5 rounded px-1 text-left hover:bg-accent hover:text-primary"
          >
            {!startsWithSubject(form) && <span className="text-xs text-muted-foreground">{label}</span>}
            <span className="font-medium">{form}</span>
          </button>
        ) : null,
      )}
    </div>
  )
}

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
        {item.conjugation && (
          <div className="mt-3">
            <p className="text-xs font-medium text-muted-foreground">
              {item.conjugation.tense === 'conditional'
                ? t('lesson.conjugation.conditionalTitle')
                : t('lesson.conjugation.title')}
            </p>
            <p className="text-[11px] text-muted-foreground/70">{t('lesson.formsTapHint')}</p>
            <FormsGrid
              forms={[
                ['je', item.conjugation.je],
                ['tu', item.conjugation.tu],
                ['il/elle', item.conjugation.ilElle],
                ['nous', item.conjugation.nous],
                ['vous', item.conjugation.vous],
                ['ils/elles', item.conjugation.ilsElles],
              ]}
            />
          </div>
        )}
        {item.agreement && (
          <>
            <p className="mt-3 text-xs font-medium text-muted-foreground">{t('lesson.agreement.title')}</p>
            <p className="text-[11px] text-muted-foreground/70">{t('lesson.formsTapHint')}</p>
            <FormsGrid
              forms={[
                [t('lesson.agreement.masculineSingular'), item.agreement.masculineSingular],
                [t('lesson.agreement.feminineSingular'), item.agreement.feminineSingular],
                [t('lesson.agreement.masculinePlural'), item.agreement.masculinePlural],
                [t('lesson.agreement.femininePlural'), item.agreement.femininePlural],
              ]}
            />
          </>
        )}
        <ItemPractice item={item} />
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
        {item.conjugation && (
          <div className="mt-3">
            <p className="text-xs font-medium text-muted-foreground">
              {item.conjugation.tense === 'conditional'
                ? t('lesson.conjugation.conditionalTitle')
                : t('lesson.conjugation.title')}
            </p>
            <p className="text-[11px] text-muted-foreground/70">{t('lesson.formsTapHint')}</p>
            <FormsGrid
              forms={[
                ['je', item.conjugation.je],
                ['tu', item.conjugation.tu],
                ['il/elle', item.conjugation.ilElle],
                ['nous', item.conjugation.nous],
                ['vous', item.conjugation.vous],
                ['ils/elles', item.conjugation.ilsElles],
              ]}
            />
          </div>
        )}
        <ItemPractice item={item} />
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
      <ItemPractice item={item} />
    </div>
  )
}

// How many variant-bearing items get an LLM-generated forms-covering batch per practice run —
// bounded so a single lesson never fire more than a handful of proxy calls (spec §7).
const VARIANT_BATCH_CAP = 4

// A guided lesson flow (spec §3.2.3): a sequential Learn session — one learning item at a time,
// its full conjugation/agreement forms laid out to hear before moving on — then a Practice session
// (ExerciseRunner) that covers all of those forms, then a completion summary. Learning logic
// itself lives in src/lib/learningEngine/ and src/lib/storage.js — this component only renders
// state and collects input.
export default function LessonScreen({ active, onNavigate, lessonId }) {
  const { t, locale } = useLocale()
  const { profile } = useProfile()
  const lesson = useMemo(() => getLesson(lessonId), [lessonId])
  const items = useMemo(() => (lesson?.learningItemIds ?? []).map(learningItem).filter(Boolean), [lesson])

  const [stage, setStage] = useState('learn') // learn | practice | complete
  const [learnIndex, setLearnIndex] = useState(0)
  const [result, setResult] = useState(null)
  const [practiceExercises, setPracticeExercises] = useState(null)
  const [practiceMerged, setPracticeMerged] = useState(false)
  const spokenRef = useRef(null)

  // Auto-reads each new item's term aloud when the learner steps onto it in the Learn session —
  // the same browser-native French TTS as the Call and ExerciseRunner, so comprehension starts
  // by ear. Refs-guarded so React StrictMode's double-mounted effects don't speak it twice.
  const currentItemId = items[learnIndex]?.id ?? null
  useEffect(() => {
    if (stage !== 'learn' || !currentItemId || spokenRef.current === currentItemId) return
    const item = items[learnIndex]
    spokenRef.current = currentItemId
    stopSpeaking()
    const text = item.word ?? item.phrase ?? item.title
    if (text) speakFrench(text)
  }, [currentItemId, stage, learnIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  // Practice "covers all cases": besides the lesson's authored exercises, ask the LLM for a batch
  // spread across every verb conjugation / adjective agreement form the lesson teaches (the item's
  // `variants`, exactly like the per-item "Practice more" button) and merge it after the authored
  // set. If the proxy is unavailable or quota'd the lesson still practices with its authored
  // exercises — Learn & Practice never depends on the LLM (§7). Until the batch resolves,
  // `practiceExercises` stays null and the "preparing practice" loader shows.
  useEffect(() => {
    if (stage !== 'practice') return
    let cancelled = false

    const variantItems = items.filter((item) => item.conjugation || item.agreement).slice(0, VARIANT_BATCH_CAP)
    if (variantItems.length === 0) return () => { cancelled = true }

    Promise.all(
      variantItems.map((item) =>
        tutorRequest({
          type: 'itemDrill',
          learningItemId: item.id,
          term: item.word ?? item.phrase ?? item.title,
          meaning: item.meaning ?? item.explanation ?? '',
          level: item.level,
          locale,
          variants: item.conjugation ?? item.agreement,
        }),
      ),
    )
      .then((results) => {
        if (cancelled) return
        const generated = results.flatMap((res) => (res.ok && Array.isArray(res.data?.exercises) ? res.data.exercises : []))
        if (generated.length) {
          setPracticeExercises([...lesson.exercises, ...generated])
          setPracticeMerged(true)
        } else {
          setPracticeExercises(lesson.exercises)
        }
      })
      .catch(() => {
        if (!cancelled) setPracticeExercises(lesson.exercises)
      })

    return () => {
      cancelled = true
    }
  }, [stage, items, lesson?.exercises, locale]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!lesson) {
    return (
      <div className="flex h-svh w-full overflow-hidden bg-background">
        <AppSidebar active={active} onNavigate={onNavigate} />
        <main className="flex flex-1 items-center justify-center">
          <Button variant="ghost" onClick={() => onNavigate('learn')}>
            <ArrowLeft /> {t('lesson.backButton')}
          </Button>
        </main>
      </div>
    )
  }

  const handleComplete = ({ total, correct }) => {
    setLessonStatus(profile.id, lesson.id, 'done')
    setResult({ total, correct })
    setStage('complete')
  }

  // Enter Practice. Lessons that teach no verbal/adjectival forms have nothing for the LLM to
  // spread across, so their authored exercises start immediately; lessons with variant tables get
  // the null state that the "preparing practice" loader (and the merge effect) keys on.
  const startPractice = () => {
    setPracticeMerged(false)
    const variantItems = items.filter((item) => item.conjugation || item.agreement).slice(0, VARIANT_BATCH_CAP)
    setPracticeExercises(variantItems.length === 0 ? lesson.exercises : null)
    setStage('practice')
  }

  const currentItem = items[Math.min(learnIndex, items.length - 1)]
  const isLastItem = learnIndex >= items.length - 1

  return (
    <div className="flex h-svh w-full overflow-hidden bg-background">
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
              <div>
                <p className="text-xs text-muted-foreground">
                  {t('lesson.learnItemProgress', { current: learnIndex + 1, total: items.length })}
                </p>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted">
                  <div
                    className="h-1.5 rounded-full bg-primary transition-all"
                    style={{ width: `${(learnIndex / items.length) * 100}%` }}
                  />
                </div>
              </div>

              <LearningItemCard key={currentItem.id} item={currentItem} t={t} />

              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={learnIndex === 0}
                  onClick={() => setLearnIndex((i) => i - 1)}
                >
                  <ChevronLeft /> {t('lesson.previousItem')}
                </Button>
                {!isLastItem ? (
                  <Button onClick={() => setLearnIndex((i) => i + 1)}>
                    {t('lesson.nextItem')} <ChevronRight />
                  </Button>
                ) : (
                  <Button onClick={startPractice}>{t('lesson.startPractice')}</Button>
                )}
              </div>

              <LessonAsk lesson={lesson} currentItem={currentItem} />
            </>
          )}

          {stage === 'practice' &&
            (practiceExercises === null ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center" role="status">
                <Loader2 className="size-5 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">{t('lesson.practice.preparing')}</p>
              </div>
            ) : (
              <>
                {practiceMerged && (
                  <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                    {t('lesson.practice.coversAllForms')}
                  </p>
                )}
                <ExerciseRunner exercises={practiceExercises} onComplete={handleComplete} />
              </>
            ))}

          {stage === 'practice' && <LessonAsk lesson={lesson} currentItem={currentItem} />}

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

          {stage === 'complete' && result && <LessonAsk lesson={lesson} currentItem={currentItem} />}
        </div>
      </main>
    </div>
  )
}