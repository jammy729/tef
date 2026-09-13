import { useState } from 'react'
import CallScreen from './components/CallScreen'
import HistoriqueScreen from './components/HistoriqueScreen'
import ObjectifScreen from './components/ObjectifScreen'
import ProgressScreen from './components/ProgressScreen'
import LearnScreen from './components/LearnScreen'
import LessonScreen from './components/LessonScreen'
import { ProfileProvider } from './lib/profiles'
import { LocaleProvider } from './lib/i18n/LocaleContext'

const SCREENS = {
  call: CallScreen,
  historique: HistoriqueScreen,
  objectif: ObjectifScreen,
  progress: ProgressScreen,
  learn: LearnScreen,
  lesson: LessonScreen,
}

function App() {
  const [view, setView] = useState('learn')
  const [callConfig, setCallConfig] = useState(null)
  const [lessonId, setLessonId] = useState(null)

  const navigate = (nextView, param) => {
    setView(nextView)
    if (nextView === 'call' && param !== undefined) setCallConfig(param)
    if (nextView === 'lesson' && param !== undefined) setLessonId(param)
  }

  const Screen = SCREENS[view] ?? LearnScreen

  return (
    <ProfileProvider>
      <LocaleProvider>
        <Screen active={view} onNavigate={navigate} callConfig={callConfig} lessonId={lessonId} />
      </LocaleProvider>
    </ProfileProvider>
  )
}

export default App
