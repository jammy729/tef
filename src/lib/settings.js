// App-level (global, not per-profile) LLM settings — the bring-your-own-key provider config for
// the /api/tutor proxy. Same storage pattern as generatedContent.js: its own localStorage key,
// shared across both profiles, since it's device/app config, not personal data. The Settings
// screen reads/writes this; every /api/tutor request merges the active provider + key via
// src/lib/llm.js's tutorRequest.

const SETTINGS_KEY = 'tef:settings:v1'

export const DEFAULT_PROVIDER = 'groq'

export const PROVIDERS = [
  { id: 'groq', labelKey: 'settings.provider.groq', noteKey: 'settings.provider.groq.note' },
  { id: 'anthropic', labelKey: 'settings.provider.anthropic', noteKey: 'settings.provider.anthropic.note' },
  { id: 'openai', labelKey: 'settings.provider.openai', noteKey: 'settings.provider.openai.note' },
  { id: 'gemini', labelKey: 'settings.provider.gemini', noteKey: 'settings.provider.gemini.note' },
  { id: 'custom', labelKey: 'settings.provider.custom', noteKey: 'settings.provider.custom.note' },
]

export const DEFAULT_VOICE = { rate: 1, gender: 'female' }

export function defaultSettings() {
  return { provider: DEFAULT_PROVIDER, apiKeys: {}, custom: { baseUrl: '', model: '' }, voice: DEFAULT_VOICE }
}

export function getSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return defaultSettings()
    const parsed = JSON.parse(raw)
    const provider = PROVIDERS.some((p) => p.id === parsed.provider) ? parsed.provider : DEFAULT_PROVIDER
    const apiKeys = {}
    for (const p of PROVIDERS) {
      if (typeof parsed.apiKeys?.[p.id] === 'string') apiKeys[p.id] = parsed.apiKeys[p.id]
    }
    const custom = {
      baseUrl: typeof parsed.custom?.baseUrl === 'string' ? parsed.custom.baseUrl : '',
      model: typeof parsed.custom?.model === 'string' ? parsed.custom.model : '',
    }
    const rate = typeof parsed.voice?.rate === 'number' ? Math.min(1.5, Math.max(0.5, parsed.voice.rate)) : DEFAULT_VOICE.rate
    const gender = parsed.voice?.gender === 'male' ? 'male' : 'female'
    return { provider, apiKeys, custom, voice: { rate, gender } }
  } catch {
    return defaultSettings()
  }
}

export function saveSettings(settings) {
  const clean = {
    provider: settings.provider,
    apiKeys: { ...settings.apiKeys },
    custom: { baseUrl: settings.custom?.baseUrl ?? '', model: settings.custom?.model ?? '' },
    voice: {
      rate: typeof settings.voice?.rate === 'number' ? settings.voice.rate : DEFAULT_VOICE.rate,
      gender: settings.voice?.gender === 'male' ? 'male' : 'female',
    },
  }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(clean))
}

// What every /api/tutor request should send so the proxy knows which provider + key to use. The
// key is the learner's own secret, sent only to the app's proxy endpoint (which routes it to the
// chosen provider) — never bundled in app code or shipped in the repo.
export function llmRequestMeta() {
  const { provider, apiKeys, custom } = getSettings()
  const meta = { provider, apiKey: apiKeys[provider] ?? '' }
  if (provider === 'custom') {
    meta.baseUrl = custom.baseUrl ?? ''
    meta.model = custom.model ?? ''
  }
  return meta
}