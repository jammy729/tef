import { BookOpen, CheckCircle2, Headphones, Phone, Pencil, Star, Target } from 'lucide-react'
import AppSidebar from './AppSidebar'
import EvolutionChart from './EvolutionChart'
import { Button } from './ui/button'
import { useProfile } from '../lib/profiles'
import { useLocale } from '../lib/i18n/LocaleContext'
import { getSessions, getStreakDays } from '../lib/storage'
import { categoryInfo, goalPercent, scoreToBand, sessionAverage } from '../lib/rubric'
import { callSessionLabel } from '../lib/sessionLabel'

const RUBRIC_DIMENSIONS = ['taskAchievement', 'fluency', 'grammar', 'vocabulary', 'coherence']

function formatDuration(seconds) {
  const m = Math.round(seconds / 60)
  return `${m} min`
}

// ponytail: rubric/evolution/corrections now come from real session data (storage.js). The
// screen always shows the most recent session for the active profile — no session-id routing.
export default function HistoriqueScreen({ active, onNavigate }) {
  const { profile } = useProfile()
  const { t, locale } = useLocale()
  const sessions = getSessions(profile.id)
  const session = sessions[sessions.length - 1] ?? null

  if (!session) {
    return (
      <div className="flex h-svh w-full overflow-hidden bg-background">
        <AppSidebar active={active} onNavigate={onNavigate} />
        <main className="flex min-w-0 flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
          <h1 className="text-h1">{t('historique.evolution.empty')}</h1>
          <Button onClick={() => onNavigate('call', null)}>
            <Phone /> {t('historique.cta.bookNext')}
          </Button>
        </main>
      </div>
    )
  }

  const priorSessions = sessions.slice(0, -1)
  const evolutionSessions = sessions.slice(-8)
  const points = evolutionSessions.map((s) => sessionAverage(s) / 5)
  const labels = evolutionSessions.map((_, i) => `${i + 1}`)

  const pctBefore = goalPercent(priorSessions)
  const pctAfter = goalPercent(sessions)
  const topFocus = session.focusAreas?.[0]
  const topFocusLabel = topFocus && categoryInfo(topFocus).titleKey ? t(categoryInfo(topFocus).titleKey) : topFocus
  const streak = getStreakDays(profile.id)

  return (
    <div className="flex h-svh w-full overflow-hidden bg-background">
      <AppSidebar active={active} onNavigate={onNavigate} />

      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="flex items-center justify-between border-b border-border px-6 py-5 md:px-10">
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="size-4" />
            </span>
            <div>
              <h1 className="text-h1 text-xl">{t('historique.header.title')}</h1>
              <p className="text-sm text-muted-foreground">
                {t('historique.header.subtitle', {
                  date: new Date(session.startedAt).toLocaleDateString(locale),
                  duration: formatDuration(session.durationSec),
                  topic: callSessionLabel(session, t, locale),
                })}
              </p>
            </div>
          </div>
          <Button variant="soft" size="sm">
            <Headphones /> {t('historique.relisten')}
          </Button>
        </header>

        <div className="flex flex-1 flex-col gap-8 p-6 md:flex-row md:p-10">
          <div className="flex min-w-0 flex-1 flex-col gap-8">
            <section>
              <h2 className="text-h2">{t('historique.rubric.title')}</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
                {RUBRIC_DIMENSIONS.map((dim) => (
                  <div key={dim} className="rounded-xl border border-border bg-card px-4 py-4">
                    <p className="label-caps">{t(`historique.rubric.${dim}`)}</p>
                    <p className="mt-1.5 font-serif text-2xl font-semibold">
                      {scoreToBand(session.scores?.[dim] ?? 0)}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-baseline justify-between">
                <h2 className="text-h2">{t('historique.evolution.title', { n: evolutionSessions.length })}</h2>
                <span className="text-sm text-muted-foreground">{t('historique.evolution.estimation')}</span>
              </div>
              <div className="mt-4 rounded-xl border border-border bg-card px-6 py-6">
                {points.length > 1 ? (
                  <EvolutionChart points={points} labels={labels} ariaLabel={t('historique.evolution.title', { n: evolutionSessions.length })} />
                ) : (
                  <p className="py-10 text-center text-sm text-muted-foreground">{t('historique.evolution.empty')}</p>
                )}
              </div>
            </section>

            <section>
              <h2 className="text-h2">{t('historique.corrections.title')}</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(!session.corrections || session.corrections.length === 0) && (
                  <p className="text-sm text-muted-foreground">{t('historique.corrections.empty')}</p>
                )}
                {session.corrections?.length > 0 && (
                  <div className="rounded-xl border border-border bg-card px-4 py-4">
                    <p className="label-caps flex items-center gap-1.5 text-primary">
                      <Pencil className="size-3.5" /> {t('historique.corrections.title')}
                    </p>
                    <ul className="mt-2.5 flex flex-col gap-2 text-sm">
                      {session.corrections.map((c, i) => (
                        <li key={i}>
                          <span className="text-muted-foreground line-through">{c.said}</span>{' '}
                          <span className="font-medium">→ {c.correction}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {session.strengths?.length > 0 && (
                  <div className="rounded-xl border border-border bg-card px-4 py-4">
                    <p className="label-caps flex items-center gap-1.5 text-success">
                      <Star className="size-3.5" /> {t('historique.strengths.title')}
                    </p>
                    <ul className="mt-2.5 flex flex-col gap-2 text-sm">
                      {session.strengths.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {session.vocabSuggestions?.length > 0 && (
                  <div className="rounded-xl border border-border bg-card px-4 py-4">
                    <p className="label-caps flex items-center gap-1.5 text-primary">
                      <BookOpen className="size-3.5" /> {t('historique.vocab.title')}
                    </p>
                    <ul className="mt-2.5 flex flex-col gap-2 text-sm">
                      {session.vocabSuggestions.map((v) => (
                        <li key={v}>{v}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="flex w-full flex-col gap-4 md:w-80 md:shrink-0">
            <div className="rounded-xl bg-sidebar-dark px-4 py-4 text-sidebar-dark-foreground">
              <p className="label-caps text-primary">{t('historique.progression.title')}</p>
              <p className="mt-1.5 font-serif text-lg font-semibold">
                {pctBefore}% → {pctAfter}%
              </p>
              {topFocusLabel && (
                <p className="mt-1.5 text-xs leading-relaxed text-sidebar-dark-foreground/70">
                  {t('historique.progression.body', { category: topFocusLabel })}
                </p>
              )}
              <div className="mt-3 flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-white/15">
                  <div className="h-1.5 rounded-full bg-primary" style={{ width: `${pctAfter}%` }} />
                </div>
                <span className="text-xs text-sidebar-dark-foreground/60">{pctAfter}%</span>
              </div>
            </div>

            {topFocus && (
              <div>
                <p className="label-caps px-1">{t('historique.nextFocus.title')}</p>
                <div className="mt-2 flex gap-2.5 rounded-xl border border-primary/30 bg-card px-4 py-3.5">
                  <Target className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{topFocusLabel}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{t('historique.nextFocus.body')}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-border bg-card px-3 py-3 text-center">
                <p className="font-serif text-xl font-semibold text-primary">{sessions.length}</p>
                <p className="text-xs text-muted-foreground">{t('insights.statsCallsCompleted')}</p>
              </div>
              <div className="rounded-xl border border-border bg-card px-3 py-3 text-center">
                <p className="font-serif text-xl font-semibold text-primary">{streak}</p>
                <p className="text-xs text-muted-foreground">{t('insights.statsStreak')}</p>
              </div>
            </div>

            <Button onClick={() => onNavigate('call', null)}>
              <Phone /> {t('historique.cta.bookNext')}
            </Button>
            <Button variant="secondary" onClick={() => onNavigate('objectif')}>
              <BookOpen /> {t('historique.cta.reviewGrammar')}
            </Button>
          </aside>
        </div>
      </main>
    </div>
  )
}
