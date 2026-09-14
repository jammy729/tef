import { useEffect, useState } from 'react'
import CallScreen from './components/CallScreen'
import HistoriqueScreen from './components/HistoriqueScreen'
import ObjectifScreen from './components/ObjectifScreen'
import ProgressScreen from './components/ProgressScreen'
import LearnScreen from './components/LearnScreen'
import LessonScreen from './components/LessonScreen'
import SettingsScreen from './components/SettingsScreen'
import OnboardingScreen from './components/OnboardingScreen'
import { ProfileProvider, useProfile } from './lib/profiles'
import { LocaleProvider } from './lib/i18n/LocaleContext'
import { ONBOARDING_PATH, pathToView, viewToPath } from './lib/router'
import { stopSpeaking } from './lib/audio'

const SCREENS = {
  call: CallScreen,
  historique: HistoriqueScreen,
  objectif: ObjectifScreen,
  progress: ProgressScreen,
  learn: LearnScreen,
  lesson: LessonScreen,
  settings: SettingsScreen,
}

function Router() {
  const initial = pathToView(window.location.pathname)
  const [view, setView] = useState(initial.view)
  const [callConfig, setCallConfig] = useState(null)
  const [lessonId, setLessonId] = useState(initial.lessonId ?? null)
  const { session, profile, ready } = useProfile()

  const navigate = (nextView, param) => {
    stopSpeaking() // any in-flight spoken audio dies the instant a screen switch starts
    setView(nextView)
    if (nextView === 'call' && param !== undefined) setCallConfig(param)
    if (nextView === 'lesson' && param !== undefined) setLessonId(param)
    window.history.pushState(null, '', viewToPath(nextView, param))
  }

  // Back/forward buttons: re-derive view state from the URL instead of navigate() (no new push).
  useEffect(() => {
    const onPopState = () => {
      stopSpeaking()
      const next = pathToView(window.location.pathname)
      setView(next.view)
      if (next.lessonId) setLessonId(next.lessonId)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // Logged-in, onboarded users who land on /registration (e.g. a shared link or the auth email
  // confirm flow) shouldn't see the sign-in gate — bounce them to the default view. The not-
  // onboarded/not-signed-in cases below keep them there instead. The render guard below shows
  // LearnScreen even before this effect runs; this effect just fixes the URL.
  useEffect(() => {
    if (!ready || !session || !profile?.onboarded) return
    if (window.location.pathname === ONBOARDING_PATH) {
      window.history.replaceState(null, '', '/learn')
    }
  }, [ready, session, profile, view])

  if (!ready) return <div className="flex min-h-screen items-center justify-center bg-background" />

  if (!session || !profile.onboarded) {
    if (window.location.pathname !== ONBOARDING_PATH) {
      window.history.replaceState(null, '', ONBOARDING_PATH)
    }
    return <OnboardingScreen onDone={() => navigate('learn')} />
  }

  const onRegistrationLoggedIn = view === 'registration' || window.location.pathname === ONBOARDING_PATH
  const effectiveView = onRegistrationLoggedIn ? 'learn' : view
  const Screen = SCREENS[effectiveView] ?? LearnScreen
  // Keying LessonScreen by lessonId remounts it on lesson change, so a lesson always starts in its
  // fresh Learn stage rather than resuming whatever UI state the previous lesson left behind.
  return (
    <Screen
      key={effectiveView === 'lesson' ? lessonId : undefined}
      active={effectiveView}
      onNavigate={navigate}
      callConfig={callConfig}
      lessonId={lessonId}
    />
  )
}

function App() {
  return (
    <ProfileProvider>
      <LocaleProvider>
        <Router />
      </LocaleProvider>
    </ProfileProvider>
  )
}

export default App
