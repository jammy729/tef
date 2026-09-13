import { AlertTriangle, BookOpen, CalendarClock, CheckCircle2, Pencil, Volume2 } from 'lucide-react'
import { useProfile } from '../lib/profiles'
import { useLocale } from '../lib/i18n/LocaleContext'
import { getLatestSession, getSessions, getStreakDays, getTopWeakCategories } from '../lib/storage'
import { categoryInfo } from '../lib/rubric'
import WhyExplain from './WhyExplain'

const CATEGORY_ICON = {
  pronunciation: Volume2,
  vocabulary: BookOpen,
}

function categoryLabel(t, category) {
  const info = categoryInfo(category)
  return info.titleKey ? t(info.titleKey) : info.fallback
}

// ponytail: "Camille se souvient" is derived from real data (exam date + top weak category),
// not a full free-text memory of past conversations — that would need its own LLM pass.
export default function CallInsights({ corrections }) {
  const { profile } = useProfile()
  const { t } = useLocale()
  const sessions = getSessions(profile.id)
  const topFocus = getTopWeakCategories(profile.id, 1)[0]
  const latestSession = getLatestSession(profile.id)
  const streak = getStreakDays(profile.id)

  return (
    <aside className="hidden w-80 shrink-0 flex-col gap-4 overflow-y-auto border-l border-border px-4 py-6 lg:flex">
      <div className="rounded-xl bg-sidebar-dark px-4 py-4 text-sidebar-dark-foreground">
        <p className="label-caps text-primary">{t('insights.focusTitle')}</p>
        {topFocus ? (
          <>
            <p className="mt-1.5 font-serif text-base font-semibold">
              {categoryLabel(t, topFocus.category)}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-sidebar-dark-foreground/70">
              {categoryInfo(topFocus.category).descriptionKey
                ? t(categoryInfo(topFocus.category).descriptionKey)
                : ''}
            </p>
          </>
        ) : (
          <>
            <p className="mt-1.5 font-serif text-base font-semibold">
              {t('insights.focusEmpty.title')}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-sidebar-dark-foreground/70">
              {t('insights.focusEmpty.description')}
            </p>
          </>
        )}
      </div>

      <div>
        <p className="label-caps px-1">{t('insights.correctionsTitle')}</p>
        <div className="mt-2 flex flex-col gap-2">
          {corrections.length === 0 && (
            <p className="px-1 text-sm text-muted-foreground">{t('insights.correctionsEmpty')}</p>
          )}
          {corrections.map((correction, i) => {
            const Icon = CATEGORY_ICON[correction.category] ?? Pencil
            return (
              <div
                key={`${correction.said}-${i}`}
                className="flex gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5"
              >
                <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-sm leading-snug font-medium">
                    {correction.said} → {correction.correction}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{correction.reason}</p>
                  <div className="mt-1">
                    <WhyExplain correction={correction} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <p className="label-caps px-1">{t('insights.memoryTitle')}</p>
        <div className="mt-2 flex flex-col gap-2 rounded-xl border border-border bg-card px-3 py-3">
          {profile.examDate && (
            <div className="flex items-start gap-2.5 text-sm">
              <CalendarClock className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{t('insights.memoryExam', { date: profile.examDate })}</span>
            </div>
          )}
          {topFocus ? (
            <div className="flex items-start gap-2.5 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
              <span>
                {t('insights.memoryTopFocus', { category: categoryLabel(t, topFocus.category) })}
              </span>
            </div>
          ) : (
            !latestSession && (
              <div className="flex items-start gap-2.5 text-sm">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{t('insights.memoryFirstCall')}</span>
              </div>
            )
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border bg-card px-3 py-3 text-center">
          <p className="text-xl font-semibold text-primary">{sessions.length}</p>
          <p className="text-xs text-muted-foreground">{t('insights.statsCallsCompleted')}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-3 py-3 text-center">
          <p className="text-xl font-semibold text-primary">{streak}</p>
          <p className="text-xs text-muted-foreground">{t('insights.statsStreak')}</p>
        </div>
      </div>
    </aside>
  )
}
