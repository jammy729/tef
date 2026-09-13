import { createContext, useContext, useMemo, useState } from 'react'
import { getLocale, setLocale as persistLocale } from '../storage'
import en from './en'
import fr from './fr'

const DICTS = { en, fr }
const DEFAULT_LOCALE = 'en'

const LocaleContext = createContext(null)

function interpolate(str, vars) {
  if (!vars) return str
  return str.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match))
}

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(() => getLocale() ?? DEFAULT_LOCALE)

  const setLocale = (next) => {
    setLocaleState(next)
    persistLocale(next)
  }

  const value = useMemo(() => {
    const dict = DICTS[locale] ?? DICTS[DEFAULT_LOCALE]
    const t = (key, vars) => interpolate(dict[key] ?? key, vars)
    return { locale, setLocale, t }
  }, [locale])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider')
  return ctx
}
