import { useState } from 'react'
import { Button } from './ui/button'
import { Card } from './ui/card'
import ExerciseRunner from './ExerciseRunner'
import { cn } from '../lib/utils'
import { useLocale } from '../lib/i18n/LocaleContext'
import { useProfile, LEVELS } from '../lib/profiles'
import { getPlacementExercises } from '../content/course'

// ponytail: only two real CEFR levels exist in the content to sample from (A2/B1), so this maps a
// raw quiz score onto the full A1-C2 chip range as a rough band, not a precise CEFR placement —
// upgrade the brackets if higher-level content ever gets authored.
function scoreToLevel({ correct, total }) {
  const ratio = total ? correct / total : 0
  if (ratio < 0.4) return 'a1'
  if (ratio < 0.65) return 'a2'
  if (ratio < 0.85) return 'b1'
  return 'b2'
}

// Sign-in/sign-up (real Supabase Auth, spec §4) followed by a one-time local setup: display name
// + self-assessed starting level, captured once per account before it lands in Learn & Practice.
export default function OnboardingScreen({ onDone }) {
  const { t } = useLocale()
  const { session, profile, signIn, signUp, completeOnboarding } = useProfile()

  const [step, setStep] = useState('auth')
  const [mode, setMode] = useState('signIn') // signIn | signUp
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

  const [name, setName] = useState('')
  const [level, setLevel] = useState('b1')
  const [quizzing, setQuizzing] = useState(false)
  const [quizResult, setQuizResult] = useState(null)
  const [quizExercises] = useState(() => getPlacementExercises())

  // Derived at render time (not stored/synced via an effect): once a session exists, the auth
  // step is behind us. If the sign-up form already collected a name, skip straight to the level
  // step; otherwise (sign-in on an account that never finished setup) fall back to asking for one,
  // pre-filled from the freshly hydrated profile's name (the account email until one is saved).
  const effectiveStep = step === 'auth' && session ? (name.trim() ? 'level' : 'name') : step
  const displayName = name || profile?.name || ''

  const submitAuth = async (e) => {
    e.preventDefault()
    setAuthBusy(true)
    setAuthError('')
    const action = mode === 'signIn' ? signIn : signUp
    const { data, error } = await action({ email, password })
    setAuthBusy(false)
    if (error) {
      setAuthError(error.message)
      return
    }
    if (mode === 'signUp' && !data.session) {
      setCheckEmail(true)
    }
  }

  const finishQuiz = ({ correct, total }) => {
    const result = scoreToLevel({ correct, total })
    setLevel(result)
    setQuizResult(result)
    setQuizzing(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className={cn('w-full p-6', quizzing ? 'max-w-lg' : 'max-w-sm')}>
        {effectiveStep === 'auth' ? (
          <>
            <h1 className="text-lg font-semibold text-foreground">
              {mode === 'signIn' ? t('onboarding.auth.signInTitle') : t('onboarding.auth.signUpTitle')}
            </h1>
            {checkEmail ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {t('onboarding.auth.checkEmail', { email })}
              </p>
            ) : (
              <form onSubmit={submitAuth}>
                {mode === 'signUp' && (
                  <>
                    <label className="mt-4 block text-sm font-medium text-foreground" htmlFor="auth-name">
                      {t('onboarding.step1.nameLabel')}
                    </label>
                    <input
                      id="auth-name"
                      type="text"
                      required
                      autoComplete="name"
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('onboarding.step1.namePlaceholder')}
                    />
                  </>
                )}
                <label className="mt-4 block text-sm font-medium text-foreground" htmlFor="auth-email">
                  {t('onboarding.auth.emailLabel')}
                </label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  autoComplete="email"
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <label className="mt-3 block text-sm font-medium text-foreground" htmlFor="auth-password">
                  {t('onboarding.auth.passwordLabel')}
                </label>
                <input
                  id="auth-password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {authError && <p className="mt-2 text-xs text-destructive">{authError}</p>}
                <Button type="submit" className="mt-4 w-full" disabled={authBusy}>
                  {mode === 'signIn' ? t('onboarding.auth.signInButton') : t('onboarding.auth.signUpButton')}
                </Button>
              </form>
            )}
            <button
              type="button"
              onClick={() => {
                setMode((m) => (m === 'signIn' ? 'signUp' : 'signIn'))
                setAuthError('')
                setCheckEmail(false)
                setName('')
              }}
              className="mt-3 text-xs font-medium text-primary underline underline-offset-2"
            >
              {mode === 'signIn' ? t('onboarding.auth.toggleToSignUp') : t('onboarding.auth.toggleToSignIn')}
            </button>
          </>
        ) : effectiveStep === 'name' ? (
          <>
            <h1 className="text-lg font-semibold text-foreground">{t('onboarding.step1.title')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('onboarding.step1.body')}</p>
            <label className="mt-4 block text-sm font-medium text-foreground" htmlFor="onboarding-name">
              {t('onboarding.step1.nameLabel')}
            </label>
            <input
              id="onboarding-name"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              value={displayName}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('onboarding.step1.namePlaceholder')}
            />
            <Button
              className="mt-4 w-full"
              disabled={!displayName.trim()}
              onClick={() => setStep('level')}
            >
              {t('onboarding.continue')}
            </Button>
          </>
        ) : quizzing ? (
          <>
            <h1 className="text-lg font-semibold text-foreground">{t('onboarding.step2.quizButton')}</h1>
            <div className="mt-4">
              <ExerciseRunner exercises={quizExercises} onComplete={finishQuiz} />
            </div>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold text-foreground">{t('onboarding.step2.title')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('onboarding.step2.body')}</p>
            <button
              type="button"
              onClick={() => setQuizzing(true)}
              className="mt-2 text-xs font-medium text-primary underline underline-offset-2"
            >
              {t('onboarding.step2.quizPrompt')}
            </button>
            {quizResult && (
              <p className="mt-2 text-xs text-muted-foreground">
                {t('onboarding.step2.quizResult', { level: t(`level.${quizResult}`) })}
              </p>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {LEVELS.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  aria-pressed={level === lvl}
                  onClick={() => setLevel(lvl)}
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
            <div className="mt-4 flex gap-2">
              <Button variant="outline" onClick={() => setStep('name')}>
                {t('onboarding.back')}
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  completeOnboarding({ name: displayName.trim(), startingLevel: level })
                  onDone?.()
                }}
              >
                {t('onboarding.start')}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
