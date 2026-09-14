import { BarChart3, BookOpen, GraduationCap, History, LogOut, MessageCircle, Phone, Settings } from 'lucide-react'
import { cn } from '../lib/utils'
import { useProfile } from '../lib/profiles'
import { useLocale } from '../lib/i18n/LocaleContext'
import { getSessions } from '../lib/storage'
import { goalPercent } from '../lib/rubric'
import { getSettings, PROVIDERS } from '../lib/settings'
import { callsToday, getUsage } from '../lib/usage'

const NAV_ITEMS = [
  { icon: BookOpen, labelKey: 'nav.learn', view: 'learn' },
  { icon: Phone, labelKey: 'nav.call', view: 'call' },
  { icon: History, labelKey: 'nav.historique', view: 'historique' },
  { icon: BarChart3, labelKey: 'nav.progress', view: 'progress' },
  { icon: GraduationCap, labelKey: 'nav.objectif', view: 'objectif' },
  { icon: Settings, labelKey: 'nav.settings', view: 'settings' },
]

// ponytail: target level is fixed at B2 → C1 (spec's TEF Canada framing) — only the % is real,
// derived from recent scores. A per-profile custom target is a Réglages-screen feature, not built.
export default function AppSidebar({ active, onNavigate }) {
  const { profile, signOut } = useProfile()
  const { t } = useLocale()
  const pct = goalPercent(getSessions(profile.id))

  // Always-visible AI provider status (spec §5/§7): active provider, connection-status dot, and
  // today's request count — kept above the target-level card so usage stays in view on every screen.
  const settings = getSettings()
  const activeProvider = PROVIDERS.find((p) => p.id === settings.provider) ?? PROVIDERS[0]
  const lastTestStatus = getUsage().lastTest?.status ?? null
  const todayCalls = callsToday()
  const statusKey =
    lastTestStatus === 'ok'
      ? 'sidebar.providerStatusOk'
      : lastTestStatus === 'auth'
        ? 'sidebar.providerStatusAuth'
        : lastTestStatus === 'quota'
          ? 'sidebar.providerStatusQuota'
          : lastTestStatus === 'generic'
            ? 'sidebar.providerStatusGeneric'
            : 'sidebar.providerStatusNone'
  const statusDot =
    lastTestStatus === 'ok'
      ? 'bg-success'
      : lastTestStatus === 'auth'
        ? 'bg-destructive'
        : lastTestStatus === 'quota'
          ? 'bg-warning'
          : 'bg-white/25'

  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col justify-between overflow-y-auto border-r border-border bg-sidebar px-4 py-6 md:flex">
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
        <button
          type="button"
          onClick={() => onNavigate('settings')}
          title={t(statusKey)}
          className="rounded-xl bg-sidebar-dark px-4 py-4 text-left text-sidebar-dark-foreground"
        >
          <span className="flex items-center justify-between">
            <span className="label-caps text-primary">{t('sidebar.providerLabel')}</span>
            <span className={cn('size-2 rounded-full', statusDot)} aria-hidden="true" />
          </span>
          <span className="mt-1 flex items-baseline justify-between gap-2">
            <span className="font-serif text-lg font-semibold">{t(activeProvider.labelKey)}</span>
            <span className="text-xs text-sidebar-dark-foreground/60">
              {t('sidebar.providerToday', { n: todayCalls })}
            </span>
          </span>
          <span className="mt-0.5 block text-xs text-sidebar-dark-foreground/60">{t(statusKey)}</span>
        </button>

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

        <div className="flex items-center gap-2 rounded-full px-1 py-1">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-medium text-accent-foreground">
            {profile.initials}
          </span>
          <p className="min-w-0 flex-1 break-words text-sm font-medium">{profile.name}</p>
          <button
            type="button"
            onClick={signOut}
            aria-label={t('sidebar.logoutAria')}
            title={t('sidebar.logoutAria')}
            className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
