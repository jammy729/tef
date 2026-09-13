import { BarChart3, BookOpen, GraduationCap, History, MessageCircle, Phone, Settings } from 'lucide-react'
import { cn } from '../lib/utils'
import { useProfile } from '../lib/profiles'
import { useLocale } from '../lib/i18n/LocaleContext'
import { getSessions } from '../lib/storage'
import { goalPercent } from '../lib/rubric'

const NAV_ITEMS = [
  { icon: BookOpen, labelKey: 'nav.learn', view: 'learn' },
  { icon: Phone, labelKey: 'nav.call', view: 'call' },
  { icon: History, labelKey: 'nav.historique', view: 'historique' },
  { icon: BarChart3, labelKey: 'nav.progress', view: 'progress' },
  { icon: GraduationCap, labelKey: 'nav.objectif', view: 'objectif' },
  { icon: Settings, labelKey: 'nav.settings' },
]

// ponytail: target level is fixed at B2 → C1 (spec's TEF Canada framing) — only the % is real,
// derived from recent scores. A per-profile custom target is a Réglages-screen feature, not built.
export default function AppSidebar({ active, onNavigate }) {
  const { profile, switchProfile } = useProfile()
  const { locale, setLocale, t } = useLocale()
  const pct = goalPercent(getSessions(profile.id))

  return (
    <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-border bg-sidebar px-4 py-6 md:flex">
      <div className="flex flex-col gap-6">
        <button
          type="button"
          onClick={() => onNavigate('learn')}
          className="flex items-center gap-2 px-2 text-left"
          aria-label={t('sidebar.homeAria')}
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <MessageCircle className="size-4" />
          </span>
          <span className="font-serif text-lg font-semibold tracking-tight">Allô Prof</span>
        </button>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ icon: Icon, labelKey, view }) => {
            const isActive = view === active
            return (
              <button
                key={labelKey}
                type="button"
                disabled={!view}
                title={view ? undefined : t('sidebar.comingSoon')}
                onClick={view ? () => onNavigate(view) : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-full px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent text-primary'
                    : view
                      ? 'text-foreground hover:bg-muted'
                      : 'text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
                )}
              >
                <Icon className="size-4" />
                {t(labelKey)}
              </button>
            )
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-3">
        <div className="rounded-xl bg-sidebar-dark px-4 py-4 text-sidebar-dark-foreground">
          <p className="label-caps text-primary">{t('sidebar.goalLabel')}</p>
          <p className="mt-1 font-serif text-lg font-semibold">B2 → C1</p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-white/15">
            <div className="h-1.5 rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-sidebar-dark-foreground/60">
            {t('sidebar.goalProgress', { pct })}
          </p>
        </div>

        <button
          type="button"
          onClick={switchProfile}
          aria-label={t('sidebar.switchProfileAria')}
          className="flex items-center gap-2 rounded-full px-1 py-1 text-left hover:bg-muted"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-accent text-sm font-medium text-accent-foreground">
            {profile.initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{profile.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {t('sidebar.examGoal', { date: profile.examDate })}
            </p>
          </div>
        </button>

        <div
          role="group"
          aria-label={t('sidebar.localeAria')}
          className="flex overflow-hidden rounded-full border border-border text-xs font-medium"
        >
          {['en', 'fr'].map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={locale === l}
              onClick={() => setLocale(l)}
              className={cn(
                'flex-1 py-1.5 uppercase transition-colors',
                locale === l ? 'bg-accent text-primary' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}
