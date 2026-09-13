import { ChevronDown, Mic } from 'lucide-react'
import { useState } from 'react'
import AppSidebar from './AppSidebar'
import EvolutionChart from './EvolutionChart'
import MistakeDrill from './MistakeDrill'
import { Button } from './ui/button'
import { useProfile } from '../lib/profiles'
import { useLocale } from '../lib/i18n/LocaleContext'
import {
  getLearningProgress,
  getMistakeExamples,
  getSessions,
  getStreakDays,
  getTopWeakCategories,
} from '../lib/storage'
import { categoryInfo, sessionAverage } from '../lib/rubric'
import { callSessionLabel } from '../lib/sessionLabel'
import { cn } from '../lib/utils'
import { masteryLabel } from '../lib/learningEngine/mastery'
import { learningItem } from '../content/course'

function itemLabel(item) {
  if (item.type === 'vocabulary') return item.word
  if (item.type === 'phrase') return item.phrase
  return item.title
}

// Spec §6/Phase 6 — per-profile dashboard for the Call feature + Learn & Practice mastery. Reuses
// the same EvolutionChart (no new chart library) and rubric/category helpers as Historique/Objectif.
export default function ProgressScreen({ active, onNavigate }) {
  const { profile } = useProfile()
  const { t, locale } = useLocale()
  const [expandedCategory, setExpandedCategory] = useState(null)
  const [drillCategory, setDrillCategory] = useState(null)

  const sessions = getSessions(profile.id)
  const streak = getStreakDays(profile.id)
  const weakCategories = getTopWeakCategories(profile.id, 5)

  const trendSessions = sessions.slice(-8)
  const points = trendSessions.map((s) => sessionAverage(s) / 5)
  const labels = trendSessions.map((_, i) => `${i + 1}`)

  const recent = [...sessions].reverse().slice(0, 8)

  const learningProgress = getLearningProgress(profile.id)
  const masteryRows = Object.entries(learningProgress)
    .map(([itemId, p]) => ({ item: learningItem(itemId), progress: p }))
    .filter((row) => row.item)
    .sort((a, b) => (b.progress.lastPracticedAt ?? 0) - (a.progress.lastPracticedAt ?? 0))
    .slice(0, 8)

  const nothingYet = sessions.length === 0 && masteryRows.length === 0

  return (
    <div className="flex h-svh w-full overflow-hidden bg-background">
      <AppSidebar active={active} onNavigate={onNavigate} />

      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="border-b border-border px-6 py-5 md:px-10">
          <h1 className="text-h1 text-xl">{t('progress.header.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('progress.header.subtitle')}</p>
        </header>

        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-6 md:p-10">
          {nothingYet ? (
            <p className="text-sm text-muted-foreground">{t('progress.empty')}</p>
          ) : (
            <>
              {masteryRows.length > 0 && (
                <section>
                  <h2 className="text-h2">{t('progress.mastery.title')}</h2>
                  <div className="mt-4 flex flex-col gap-2">
                    {masteryRows.map(({ item, progress }) => (
                      <div key={item.id} className="rounded-lg border border-border bg-card px-4 py-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{itemLabel(item)}</span>
                          <span className="text-xs text-muted-foreground">{t(`mastery.${masteryLabel(progress.mastery)}`)}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted">
                          <div className="h-1.5 rounded-full bg-primary" style={{ width: `${progress.mastery}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {sessions.length > 0 && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border bg-card px-3 py-3 text-center">
                      <p className="font-serif text-xl font-semibold text-primary">{sessions.length}</p>
                      <p className="text-xs text-muted-foreground">{t('progress.stats.calls')}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card px-3 py-3 text-center">
                      <p className="font-serif text-xl font-semibold text-primary">{streak}</p>
                      <p className="text-xs text-muted-foreground">{t('progress.stats.streak')}</p>
                    </div>
                  </div>

                  <section>
                    <div className="flex items-baseline justify-between">
                      <h2 className="text-h2">{t('progress.trend.title')}</h2>
                      <span className="text-sm text-muted-foreground">
                        {t('progress.trend.estimation', { n: trendSessions.length })}
                      </span>
                    </div>
                    <div className="mt-4 rounded-xl border border-border bg-card px-6 py-6">
                      {points.length > 1 ? (
                        <EvolutionChart points={points} labels={labels} ariaLabel={t('progress.trend.title')} />
                      ) : (
                        <p className="py-10 text-center text-sm text-muted-foreground">{t('progress.empty')}</p>
                      )}
                    </div>
                  </section>

                  {weakCategories.length > 0 && (
                    <section>
                      <h2 className="text-h2">{t('progress.categories.title')}</h2>
                      <div className="mt-4 flex flex-col gap-2">
                        {weakCategories.map(({ category, count }) => {
                          const info = categoryInfo(category)
                          const label = info.titleKey ? t(info.titleKey) : info.fallback
                          const isOpen = expandedCategory === category
                          const examples = isOpen ? getMistakeExamples(profile.id, category, 3) : []
                          return (
                            <div key={category} className="rounded-lg border border-border bg-card">
                              <button
                                type="button"
                                onClick={() => setExpandedCategory(isOpen ? null : category)}
                                aria-expanded={isOpen}
                                className="flex w-full items-center justify-between px-4 py-3 text-left"
                              >
                                <span className="text-sm font-medium">{label}</span>
                                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                                  {count}×
                                  <ChevronDown className={cn('size-4 transition-transform', isOpen && 'rotate-180')} />
                                </span>
                              </button>
                              {isOpen && (
                                <div className="border-t border-border px-4 py-3">
                                  <p className="label-caps">{t('progress.mistakeBank.examples')}</p>
                                  {examples.length === 0 ? (
                                    <p className="mt-1.5 text-sm text-muted-foreground">
                                      {t('progress.mistakeBank.noExamples')}
                                    </p>
                                  ) : (
                                    <ul className="mt-1.5 flex flex-col gap-1.5 text-sm">
                                      {examples.map((ex, i) => (
                                        <li key={i}>
                                          <span className="text-muted-foreground line-through">{ex.said}</span>{' '}
                                          <span className="font-medium">→ {ex.correction}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                  {drillCategory === category ? (
                                    <MistakeDrill category={category} onClose={() => setDrillCategory(null)} />
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="soft"
                                      className="mt-3"
                                      onClick={() => setDrillCategory(category)}
                                    >
                                      {t('progress.mistakeBank.practiceButton')}
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </section>
                  )}

                  <section>
                    <h2 className="text-h2">{t('progress.sessions.title')}</h2>
                    <div className="mt-4 flex flex-col gap-2">
                      {recent.map((session) => (
                        <div
                          key={session.startedAt}
                          className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
                        >
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                            <Mic className="size-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {t('progress.sessions.call', { topic: callSessionLabel(session, t, locale) })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(session.startedAt).toLocaleDateString(locale)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
