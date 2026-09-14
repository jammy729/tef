import { useState } from 'react'
import { Globe, KeyRound, Loader2, PlugZap, Save, Server, User, Volume2 } from 'lucide-react'
import AppSidebar from './AppSidebar'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { cn } from '../lib/utils'
import { useLocale } from '../lib/i18n/LocaleContext'
import { useProfile, LEVELS } from '../lib/profiles'
import { DEFAULT_PROVIDER, getSettings, PROVIDERS, saveSettings } from '../lib/settings'
import { speakFrench } from '../lib/audio'
import { tutorRequest } from '../lib/llm'
import { recordTest } from '../lib/usage'

// The Settings screen (spec §5) — chooses which AI provider powers the app and holds the learner's
// bring-your-own API keys. Groq is the default; Claude, OpenAI, Gemini, and any OpenAI-compatible
// custom endpoint are alternatives. Keys are stored locally in this browser (src/lib/settings.js)
// and sent to the app's own proxy, never bundled into the client code or committed to the repo.
export default function SettingsScreen({ active, onNavigate }) {
  const { locale, setLocale, t } = useLocale()
  const { profile, saveProfile } = useProfile()
  const [name, setName] = useState(profile.name)
  const [level, setLevel] = useState(profile.startingLevel ?? 'b1')
  const [profileSaved, setProfileSaved] = useState(false)
  const [settings, setSettings] = useState(getSettings)
  const [saved, setSaved] = useState(false)
  const [voiceSaved, setVoiceSaved] = useState(false)
  const [testState, setTestState] = useState('idle') // idle | testing | ok | error
  const [testError, setTestError] = useState('')

  const resetTest = () => setTestState('idle')

  const setRate = (rate) => {
    setVoiceSaved(false)
    setSettings((s) => ({ ...s, voice: { ...s.voice, rate } }))
  }

  const setGender = (gender) => {
    setVoiceSaved(false)
    setSettings((s) => ({ ...s, voice: { ...s.voice, gender } }))
  }

  const onSaveVoice = () => {
    saveSettings(settings)
    setVoiceSaved(true)
  }

  // Raw French sample text, not chrome — never routed through t() (spec §5's i18n boundary rule).
  const previewVoice = () => {
    speakFrench('Bonjour, comment allez-vous aujourd’hui ?', {
      rate: settings.voice.rate,
      gender: settings.voice.gender,
    })
  }

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
      recordTest(settings.provider, 'ok')
    } else {
      setTestState('error')
      setTestError(data?.error ?? 'llm_unavailable')
      recordTest(settings.provider, data?.error === 'quota_exceeded' ? 'quota' : data?.error === 'auth_failed' ? 'auth' : 'generic')
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
          <Tabs defaultValue="profile">
            <TabsList>
              <TabsTrigger value="profile">{t('settings.tabs.profile')}</TabsTrigger>
              <TabsTrigger value="language">{t('settings.tabs.language')}</TabsTrigger>
              <TabsTrigger value="voice">{t('settings.tabs.voice')}</TabsTrigger>
              <TabsTrigger value="provider">{t('settings.tabs.provider')}</TabsTrigger>
            </TabsList>

          <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                <User className="size-4" /> {t('settings.profile.title')}
              </CardTitle>
              <CardDescription>{t('settings.profile.note')}</CardDescription>
            </CardHeader>
            <CardContent>
              <label className="flex flex-col gap-1 text-sm font-medium">
                {t('settings.profile.nameLabel')}
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    setProfileSaved(false)
                  }}
                  className="mt-0.5 h-8 rounded-md border border-border bg-background px-2.5 text-sm font-normal outline-none focus-visible:border-ring"
                />
              </label>

              <p className="mt-4 text-sm font-medium">{t('settings.profile.levelLabel')}</p>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {LEVELS.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    aria-pressed={level === lvl}
                    onClick={() => {
                      setLevel(lvl)
                      setProfileSaved(false)
                    }}
                    className={cn(
                      'rounded-md border px-3 py-2 text-sm font-medium',
                      level === lvl
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-foreground hover:bg-muted',
                    )}
                  >
                    {t(`level.${lvl}`)}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  disabled={!name.trim()}
                  onClick={() => {
                    saveProfile({ name: name.trim(), startingLevel: level })
                    setProfileSaved(true)
                  }}
                >
                  <Save className="size-4" /> {t('settings.profile.save')}
                </Button>
                {profileSaved && (
                  <p role="status" className="text-sm text-primary">
                    {t('settings.profile.saved')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          </TabsContent>

          <TabsContent value="language">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                <Globe className="size-4" /> {t('settings.language.title')}
              </CardTitle>
              <CardDescription>{t('settings.language.note')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                role="group"
                aria-label={t('settings.language.aria')}
                className="flex w-40 overflow-hidden rounded-full border border-border text-xs font-medium"
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
            </CardContent>
          </Card>
          </TabsContent>

          <TabsContent value="voice">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                <Volume2 className="size-4" /> {t('settings.voice.title')}
              </CardTitle>
              <CardDescription>{t('settings.voice.note')}</CardDescription>
            </CardHeader>
            <CardContent>
              <label className="flex flex-col gap-1 text-sm font-medium" htmlFor="voice-rate">
                {t('settings.voice.speedLabel', { rate: settings.voice.rate.toFixed(2) })}
                <input
                  id="voice-rate"
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={settings.voice.rate}
                  onChange={(e) => setRate(Number(e.target.value))}
                  className="mt-1 w-full max-w-xs accent-primary"
                />
              </label>

              <p className="mt-4 text-sm font-medium">{t('settings.voice.genderLabel')}</p>
              <div
                role="group"
                aria-label={t('settings.voice.genderLabel')}
                className="mt-1.5 flex w-56 overflow-hidden rounded-full border border-border text-sm font-medium"
              >
                {['female', 'male'].map((g) => (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={settings.voice.gender === g}
                    onClick={() => setGender(g)}
                    className={cn(
                      'flex-1 py-1.5 transition-colors',
                      settings.voice.gender === g ? 'bg-accent text-primary' : 'text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {t(`settings.voice.gender.${g}`)}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button onClick={onSaveVoice}>
                  <Save className="size-4" /> {t('settings.voice.save')}
                </Button>
                <Button variant="outline" onClick={previewVoice}>
                  <Volume2 className="size-4" /> {t('settings.voice.preview.button')}
                </Button>
                {voiceSaved && (
                  <p role="status" className="text-sm text-primary">
                    {t('settings.voice.saved')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          </TabsContent>

          <TabsContent value="provider">
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
          </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}