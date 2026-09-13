import { useState } from 'react'
import { KeyRound, Loader2, PlugZap, Save, Server } from 'lucide-react'
import AppSidebar from './AppSidebar'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { cn } from '../lib/utils'
import { useLocale } from '../lib/i18n/LocaleContext'
import { DEFAULT_PROVIDER, getSettings, PROVIDERS, saveSettings } from '../lib/settings'
import { tutorRequest } from '../lib/llm'

// The Settings screen (spec §5) — chooses which AI provider powers the app and holds the learner's
// bring-your-own API keys. Groq is the default; Claude, OpenAI, Gemini, and any OpenAI-compatible
// custom endpoint are alternatives. Keys are stored locally in this browser (src/lib/settings.js)
// and sent to the app's own proxy, never bundled into the client code or committed to the repo.
export default function SettingsScreen({ active, onNavigate }) {
  const { t } = useLocale()
  const [settings, setSettings] = useState(getSettings)
  const [saved, setSaved] = useState(false)
  const [testState, setTestState] = useState('idle') // idle | testing | ok | error
  const [testError, setTestError] = useState('')

  const resetTest = () => setTestState('idle')

  const setProvider = (id) => {
    setSaved(false)
    resetTest()
    setSettings((s) => ({ ...s, provider: id }))
  }

  const setKey = (id, value) => {
    setSaved(false)
    resetTest()
    setSettings((s) => ({ ...s, apiKeys: { ...s.apiKeys, [id]: value } }))
  }

  const setCustom = (field, value) => {
    setSaved(false)
    resetTest()
    setSettings((s) => ({ ...s, custom: { ...s.custom, [field]: value } }))
  }

  const onSave = () => {
    const apiKeys = {}
    for (const [id, value] of Object.entries(settings.apiKeys)) apiKeys[id] = String(value ?? '').trim()
    saveSettings({ ...settings, apiKeys })
    setSaved(true)
  }

  const runTest = async () => {
    setTestState('testing')
    setTestError('')
    // Test the form's *current* values (not the saved ones): the apiKey/baseUrl/model in the
    // payload override llmRequestMeta()'s saved config, and an empty key exercises the .env
    // fallback server-side — exactly what saving + a real request would do.
    const meta = { provider: settings.provider, apiKey: settings.apiKeys[settings.provider] ?? '' }
    if (settings.provider === 'custom') {
      meta.baseUrl = settings.custom.baseUrl ?? ''
      meta.model = settings.custom.model ?? ''
    }
    const { ok, data } = await tutorRequest({ type: 'test', ...meta })
    if (ok && data.ok) {
      setTestState('ok')
    } else {
      setTestState('error')
      setTestError(data?.error ?? 'llm_unavailable')
    }
  }

  return (
    <div className="flex h-svh w-full overflow-hidden bg-background">
      <AppSidebar active={active} onNavigate={onNavigate} />

      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="border-b border-border px-6 py-5 md:px-10">
          <h1 className="text-h1 text-xl">{t('settings.header.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('settings.header.subtitle')}</p>
        </header>

        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6 md:p-10">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                <Server className="size-4" /> {t('settings.provider.title')}
              </CardTitle>
              <CardDescription>{t('settings.provider.note')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div role="radiogroup" aria-label={t('settings.provider.title')} className="flex flex-col gap-2">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={settings.provider === p.id}
                    onClick={() => setProvider(p.id)}
                    className={cn(
                      'flex flex-col gap-0.5 rounded-lg border px-4 py-3 text-left transition-colors',
                      settings.provider === p.id
                        ? 'border-primary bg-accent'
                        : 'border-border bg-card hover:bg-muted',
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {t(p.labelKey)}
                      {p.id === DEFAULT_PROVIDER && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                          {t('settings.provider.defaultBadge')}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">{t(p.noteKey)}</span>
                  </button>
                ))}
              </div>

              {settings.provider === 'custom' && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    {t('settings.custom.baseUrl.label')}
                    <input
                      type="url"
                      value={settings.custom.baseUrl}
                      onChange={(e) => setCustom('baseUrl', e.target.value)}
                      placeholder={t('settings.custom.baseUrl.placeholder')}
                      className="mt-0.5 h-8 rounded-md border border-border bg-background px-2.5 text-sm font-normal outline-none focus-visible:border-ring"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    {t('settings.custom.model.label')}
                    <input
                      type="text"
                      value={settings.custom.model}
                      onChange={(e) => setCustom('model', e.target.value)}
                      placeholder={t('settings.custom.model.placeholder')}
                      className="mt-0.5 h-8 rounded-md border border-border bg-background px-2.5 text-sm font-normal outline-none focus-visible:border-ring"
                    />
                  </label>
                </div>
              )}

              <label className="mt-4 flex flex-col gap-1 text-sm font-medium">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="size-3.5" /> {t('settings.apiKey.label')}
                </span>
                <input
                  type="password"
                  value={settings.apiKeys[settings.provider] ?? ''}
                  onChange={(e) => setKey(settings.provider, e.target.value)}
                  placeholder={t('settings.apiKey.placeholder')}
                  autoComplete="off"
                  className="mt-0.5 h-8 rounded-md border border-border bg-background px-2.5 text-sm font-normal outline-none focus-visible:border-ring"
                />
              </label>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button onClick={onSave}>
                  <Save className="size-4" /> {t('settings.save')}
                </Button>
                <Button variant="outline" onClick={runTest} disabled={testState === 'testing'}>
                  {testState === 'testing' ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <PlugZap className="size-4" />
                  )}
                  {t('settings.test.button')}
                </Button>
                {testState === 'ok' && (
                  <p role="status" className="text-sm text-primary">
                    {t('settings.test.ok')}
                  </p>
                )}
                {testState === 'error' && (
                  <p role="status" className="text-sm text-destructive">
                    {t(
                      testError === 'quota_exceeded'
                        ? 'settings.test.error.quota'
                        : testError === 'auth_failed'
                          ? 'settings.test.error.auth'
                          : 'settings.test.error.generic',
                    )}
                  </p>
                )}
                {saved && (
                  <p role="status" className="text-sm text-primary">
                    {t('settings.saved')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <p className="rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
            {t('settings.privacy.note')}
          </p>
        </div>
      </main>
    </div>
  )
}