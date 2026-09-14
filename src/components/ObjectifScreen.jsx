import {
  Briefcase,
  Building2,
  Calendar,
  Check,
  Clock,
  MessageCircle,
  Phone,
  Shuffle,
  ShoppingBasket,
  Target,
} from 'lucide-react'
import { useState } from 'react'
import AppSidebar from './AppSidebar'
import { Button } from './ui/button'
import { cn } from '../lib/utils'
import { useProfile } from '../lib/profiles'
import { useLocale } from '../lib/i18n/LocaleContext'
import { getSessions, getTopWeakCategories } from '../lib/storage'
import { categoryInfo, goalPercent } from '../lib/rubric'
import { TASK_A_SCENARIOS, TASK_B_SCENARIOS, pickScenario } from '../content/scenarios'

const TOPICS = [
  { id: 'immigration', icon: Briefcase },
  { id: 'daily', icon: ShoppingBasket },
  { id: 'professional', icon: Building2 },
  { id: 'free', icon: Shuffle },
]

const MODES = ['free', 'taskA', 'taskB', 'mock']

function scenarioListFor(mode) {
  return mode === 'taskB' ? TASK_B_SCENARIOS : TASK_A_SCENARIOS
}

function GoalRing({ percent }) {
  const r = 40
  const c = 2 * Math.PI * r
  return (
    <svg width="104" height="104" viewBox="0 0 104 104" className="shrink-0 -rotate-90">
      <circle cx="52" cy="52" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="10" />
      <circle
        cx="52"
        cy="52"
        r={r}
        fill="none"
        stroke="var(--warning)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - percent / 100)}
      />
      <text
        x="52"
        y="52"
        textAnchor="middle"
        dominantBaseline="central"
        transform="rotate(90 52 52)"
        className="fill-sidebar-dark-foreground font-serif text-xl font-semibold"
      >
        {percent}%
      </text>
    </svg>
  )
}

// ponytail: "ce que Camille a remarqué" + goal % are derived from real errorStats/sessions
// (storage.js). Mode/topic/scenario selection is passed to CallScreen via
// onNavigate('call', { mode, topic, scenarioId }).
export default function ObjectifScreen({ active, onNavigate }) {
  const [topic, setTopic] = useState('immigration')
  const [mode, setMode] = useState('free')
  const [scenario, setScenario] = useState(null)
  const { profile } = useProfile()
  const { t, locale } = useLocale()
  const sessions = getSessions(profile.id)
  const weakCategories = getTopWeakCategories(profile.id, 3)
  const pct = goalPercent(getSessions(profile.id))
  const topFocus = weakCategories[0]

  const handleModeChange = (nextMode) => {
    setMode(nextMode)
    setScenario(nextMode === 'free' ? null : pickScenario(scenarioListFor(nextMode)))
  }

  const redrawScenario = () => setScenario(pickScenario(scenarioListFor(mode)))

  const subjectLabel =
    mode === 'free'
      ? t(`objectif.topics.${topic}.title`)
      : `${t(`call.mode.${mode}`)} — ${scenario?.[locale] ?? scenario?.en ?? ''}`

  return (
    <div className="flex h-svh w-full overflow-hidden bg-background">
      <AppSidebar active={active} onNavigate={onNavigate} />

      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="flex items-center justify-between border-b border-border px-6 py-5 md:px-10">
          <div>
            <h1 className="text-h1 text-xl">{t('objectif.header.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('objectif.header.subtitle')}</p>
          </div>
          {profile.examDate && (
            <span className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
              <Calendar className="size-3.5" /> {t('objectif.examBadge', { date: profile.examDate })}
            </span>
          )}
        </header>

        <div className="flex flex-1 flex-col gap-8 p-6 md:p-10">
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="flex flex-1 items-center gap-6 rounded-xl bg-sidebar-dark px-6 py-6 text-sidebar-dark-foreground">
              <div className="min-w-0 flex-1">
                <p className="label-caps text-primary">{t('objectif.goal.label')}</p>
                <p className="mt-1.5 font-serif text-2xl font-semibold">
                  {t('objectif.goal.level', { from: 'B2', to: 'C1' })}
                </p>
                <p className="mt-1.5 text-sm text-sidebar-dark-foreground/70">{t('objectif.goal.body')}</p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <GoalRing percent={pct} />
                <span className="text-xs text-sidebar-dark-foreground/60">{t('objectif.goal.toward')}</span>
              </div>
            </div>

            <div className="flex w-full flex-col gap-4 rounded-xl border border-border bg-card px-6 py-6 lg:w-80 lg:shrink-0">
              <div className="flex flex-col items-center text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-accent font-serif text-xl font-semibold text-primary">
                  C
                </div>
                <p className="mt-2 font-serif text-lg font-semibold">Camille</p>
                <p className="text-sm text-muted-foreground">{t('objectif.camille.ready')}</p>
              </div>
              <div className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
                {topFocus && (
                  <p className="flex items-start gap-2">
                    <Target className="mt-0.5 size-4 shrink-0 text-primary" />
                    {t('objectif.focus.label', {
                      category: categoryInfo(topFocus.category).titleKey
                        ? t(categoryInfo(topFocus.category).titleKey)
                        : topFocus.category,
                    })}
                  </p>
                )}
                <p className="flex items-start gap-2">
                  <Briefcase className="mt-0.5 size-4 shrink-0 text-primary" />
                  {t('objectif.subject.label', { topic: subjectLabel })}
                </p>
                <p className="flex items-start gap-2">
                  <Clock className="mt-0.5 size-4 shrink-0 text-primary" />
                  {t('objectif.duration.label')}
                </p>
                <p className="flex items-start gap-2">
                  <MessageCircle className="mt-0.5 size-4 shrink-0 text-primary" />
                  {sessions.length > 0
                    ? t('objectif.memory.label', { n: sessions.length })
                    : t('objectif.memory.empty')}
                </p>
              </div>
              <Button
                onClick={() =>
                  onNavigate('call', {
                    mode,
                    topic: mode === 'free' ? topic : null,
                    scenarioId: scenario?.id ?? null,
                  })
                }
              >
                <Phone /> {t('objectif.cta.call')}
              </Button>
              <p className="text-center text-xs text-muted-foreground">{t('objectif.hangupNote')}</p>
            </div>
          </div>

          <section>
            <div className="flex items-baseline justify-between">
              <h2 className="text-h2">{t('objectif.noticed.title')}</h2>
              <span className="text-sm text-muted-foreground">
                {sessions.length > 0 ? t('objectif.noticed.basedOn', { n: sessions.length }) : ''}
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {weakCategories.length === 0 && (
                <p className="text-sm text-muted-foreground">{t('objectif.noticed.empty')}</p>
              )}
              {weakCategories.map(({ category, count }, i) => {
                const info = categoryInfo(category)
                return (
                  <div
                    key={category}
                    className={cn(
                      'rounded-xl border bg-card px-4 py-4',
                      i === 0 ? 'border-primary/40' : 'border-border',
                    )}
                  >
                    {i === 0 && (
                      <span className="mb-2 inline-block rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground">
                        {t('objectif.noticed.priorityBadge')}
                      </span>
                    )}
                    <p className="mt-2 text-sm font-semibold">{info.titleKey ? t(info.titleKey) : info.fallback}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{count}×</p>
                  </div>
                )
              })}
            </div>
          </section>

          <section>
            <h2 className="text-h2">{t('objectif.mode.title')}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              {MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleModeChange(m)}
                  aria-pressed={mode === m}
                  className={cn(
                    'rounded-xl border px-4 py-3 text-left transition-colors',
                    mode === m ? 'border-primary bg-accent/60' : 'border-border bg-card hover:bg-muted',
                  )}
                >
                  <p className="text-sm font-semibold">{t(`call.mode.${m}`)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t(`objectif.mode.${m}.note`)}</p>
                </button>
              ))}
            </div>
          </section>

          {mode === 'free' ? (
            <section>
              <h2 className="text-h2">{t('objectif.topics.title')}</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {TOPICS.map(({ id, icon: Icon }) => {
                  const selected = id === topic
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTopic(id)}
                      aria-pressed={selected}
                      className={cn(
                        'flex items-start gap-3 rounded-xl border px-4 py-4 text-left transition-colors',
                        selected ? 'border-primary bg-accent/60' : 'border-border bg-card hover:bg-muted',
                      )}
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{t(`objectif.topics.${id}.title`)}</span>
                        <span className="mt-0.5 block text-sm text-muted-foreground">
                          {t(`objectif.topics.${id}.note`)}
                        </span>
                      </span>
                      {selected && (
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="size-3" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </section>
          ) : (
            scenario && (
              <section>
                <div className="flex items-baseline justify-between">
                  <h2 className="text-h2">{t(`call.mode.${mode}`)}</h2>
                  <Button variant="secondary" size="sm" onClick={redrawScenario}>
                    <Shuffle /> {t('objectif.scenario.redraw')}
                  </Button>
                </div>
                <div className="mt-4 rounded-xl border border-border bg-card px-5 py-4">
                  <p className="font-serif text-lg leading-relaxed">{scenario.fr}</p>
                  <p className="mt-1.5 text-sm text-muted-foreground">{scenario.en}</p>
                </div>
                {mode === 'mock' && (
                  <p className="mt-3 text-sm text-muted-foreground">{t('objectif.scenario.mockNote')}</p>
                )}
              </section>
            )
          )}
        </div>
      </main>
    </div>
  )
}
