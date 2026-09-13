import { Captions, Mic, MicOff, PhoneOff, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useVoiceCall } from '../hooks/useVoiceCall'
import { Button } from './ui/button'
import { cn } from '../lib/utils'
import AppSidebar from './AppSidebar'
import CallInsights from './CallInsights'
import { useProfile } from '../lib/profiles'
import { useLocale } from '../lib/i18n/LocaleContext'
import { addSession, getLearnerLearningContext } from '../lib/storage'
import { llmErrorKey } from '../lib/errors'
import { callSessionLabel } from '../lib/sessionLabel'

function formatTimer(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0')
  const s = String(seconds % 60).padStart(2, '0')
  return `${m}:${s}`
}

export default function CallScreen({ active, onNavigate, callConfig }) {
  const { topic = null, mode = 'free', scenarioId = null } = callConfig ?? {}
  const { profile } = useProfile()
  const { t, locale } = useLocale()
  const {
    supported,
    listening,
    speaking,
    waitingForTutor,
    endingCall,
    interimText,
    transcript,
    corrections,
    llmError,
    muted,
    toggleMuted,
    startListening,
    stopListening,
    endCall,
  } = useVoiceCall(callConfig, locale, getLearnerLearningContext(profile.id).masteredExpressions)

  const [elapsed, setElapsed] = useState(0)
  const [showTranscript, setShowTranscript] = useState(true)

  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [])

  if (!supported) {
    return (
      <main className="mx-auto flex min-h-svh w-full max-w-md flex-col items-center justify-center gap-4 px-6 py-12 text-center">
        <h1 className="text-h1">{t('call.unsupported.title')}</h1>
        <p className="text-muted-foreground">{t('call.unsupported.body')}</p>
      </main>
    )
  }

  const micDisabled = speaking || waitingForTutor || endingCall
  const micLabel = listening ? t('call.mic.stop') : t('call.mic.start')
  const lastTutorTurn = [...transcript].reverse().find((t2) => t2.speaker === 'tutor')

  const handleHangup = async () => {
    const session = await endCall()
    if (session) addSession(profile.id, session)
    onNavigate('historique')
  }

  return (
    <div className="flex min-h-svh w-full bg-background">
      <AppSidebar active={active} onNavigate={onNavigate} />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-6 py-5 md:px-10">
          <div>
            <h1 className="text-h1 text-xl">{t('call.header.title')}</h1>
            <p className="text-sm text-muted-foreground">
              {mode !== 'free' || topic
                ? t('call.header.subtitleTopic', {
                    topic: callSessionLabel({ mode: mode !== 'free' ? mode : topic, scenarioId }, t, locale),
                  })
                : t('call.header.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                llmError ? 'bg-destructive/10 text-destructive' : 'bg-accent text-primary',
              )}
            >
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  llmError ? 'bg-destructive' : 'bg-primary',
                )}
              />
              {llmError ? t('call.status.offline') : t('call.status.connected')}
            </span>
          </div>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-6 py-10">
          <div className="flex flex-col items-center gap-1">
            <div className="relative flex size-24 items-center justify-center rounded-full bg-accent font-serif text-2xl font-semibold text-primary ring-4 ring-accent/50">
              C
              <span className="absolute right-0.5 bottom-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background">
                <span className="size-1.5 rounded-full bg-primary-foreground" />
              </span>
            </div>
            <h2 className="mt-2 font-serif text-lg font-semibold">Camille</h2>
            <p className="text-sm text-muted-foreground">{t('call.tutorTagline')}</p>
            <p className="mt-1 font-mono text-sm text-muted-foreground">{formatTimer(elapsed)}</p>
          </div>

          {waitingForTutor && <p className="text-sm text-muted-foreground">{t('call.thinking')}</p>}
          {endingCall && <p className="text-sm text-muted-foreground">{t('call.preparingResults')}</p>}
          {llmError && (
            <div role="alert" className="flex flex-col items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <p>{t(llmErrorKey(llmError))}</p>
              {llmError === 'quota_exceeded' && (
                <Button size="sm" variant="secondary" onClick={() => onNavigate('learn')}>
                  {t('error.goToLearn')}
                </Button>
              )}
            </div>
          )}

          {lastTutorTurn && (
            <div className="w-full max-w-xl rounded-2xl border border-border bg-card px-5 py-4">
              <p className="label-caps text-primary">{t('call.camilleSays')}</p>
              <p className="mt-1.5 font-serif leading-relaxed">« {lastTutorTurn.text} »</p>
            </div>
          )}

          {interimText && (
            <p className="w-full max-w-xl rounded-2xl bg-muted px-5 py-3 text-sm text-muted-foreground">
              {interimText}
            </p>
          )}

          {showTranscript && transcript.length > 0 && (
            <div aria-live="polite" className="flex w-full max-w-xl flex-col gap-2">
              {transcript.map((turn) => (
                <p
                  key={turn.ts}
                  className={cn(
                    'rounded-lg px-3 py-2 text-sm',
                    turn.speaker === 'tutor' ? 'bg-accent/60' : 'bg-muted',
                  )}
                >
                  <strong className="font-medium">
                    {turn.speaker === 'tutor' ? 'Camille' : t('call.you')} :
                  </strong>{' '}
                  {turn.text}
                </p>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 border-t border-border px-6 py-6">
          <Button
            type="button"
            variant="secondary"
            size="icon-lg"
            className="rounded-full"
            aria-label={showTranscript ? t('call.transcript.hide') : t('call.transcript.show')}
            aria-pressed={showTranscript}
            onClick={() => setShowTranscript((v) => !v)}
          >
            <Captions />
          </Button>

          <Button
            type="button"
            variant={listening ? 'destructive' : 'default'}
            size="icon-lg"
            aria-label={micLabel}
            disabled={micDisabled}
            onClick={listening ? stopListening : startListening}
            className="size-14 rounded-full"
          >
            {listening ? <MicOff /> : <Mic />}
          </Button>

          <Button
            type="button"
            variant="destructive"
            size="icon-lg"
            aria-label={t('call.hangupAria')}
            disabled={endingCall}
            onClick={handleHangup}
            className="size-14 rounded-full"
          >
            <PhoneOff />
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="icon-lg"
            className="rounded-full"
            aria-label={muted ? t('call.mute.on') : t('call.mute.off')}
            aria-pressed={muted}
            onClick={toggleMuted}
          >
            {muted ? <VolumeX /> : <Volume2 />}
          </Button>
        </div>
      </main>

      <CallInsights corrections={corrections} />
    </div>
  )
}
