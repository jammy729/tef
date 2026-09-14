import { Mic, MicOff, PhoneOff } from 'lucide-react'
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
import { getSettings, PROVIDERS } from '../lib/settings'
import { fetchTranslation } from './InteractiveText'

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
    micError,
    greet,
    startListening,
    stopListening,
    endCall,
  } = useVoiceCall(callConfig, locale, getLearnerLearningContext(profile.id).masteredExpressions)

  const [elapsed, setElapsed] = useState(0)
  const [translations, setTranslations] = useState({})

  useEffect(() => {
    greet()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, [])

  // Auto-translates every tutor line so the learner can glance at the meaning below Camille's
  // French without breaking the flow of the call to click anything.
  useEffect(() => {
    transcript
      .filter((turn) => turn.speaker === 'tutor' && !(turn.text in translations))
      .forEach((turn) => {
        fetchTranslation(turn.text).then((translation) => {
          if (translation) setTranslations((prev) => ({ ...prev, [turn.text]: translation }))
        })
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on transcript only, translations read via closure guard above
  }, [transcript])

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

  const micDisabled = endingCall
  const micLabel = listening ? t('call.mic.stop') : t('call.mic.start')
  const lastTutorTurn = [...transcript].reverse().find((t2) => t2.speaker === 'tutor')

  const { provider } = getSettings()
  const providerMeta = PROVIDERS.find((p) => p.id === provider)
  const liveMicKey = micError ? 'call.mic.denied' : listening || speaking ? 'call.mic.on' : 'call.mic.off'
  const routeText =
    provider === 'custom' && getSettings().custom?.model
      ? t('call.route', {
          provider: providerMeta ? t(providerMeta.labelKey) : provider,
          model: getSettings().custom.model,
        })
      : t('call.routeProvider', {
          provider: providerMeta ? t(providerMeta.labelKey) : provider,
        })

  const handleHangup = async () => {
    const session = await endCall()
    if (session) addSession(profile.id, session)
    onNavigate('historique')
  }

  return (
    <div className="flex h-svh w-full overflow-hidden bg-background">
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
            <span className="flex items-center gap-2">
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
              <span
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                  liveMicKey === 'call.mic.denied'
                    ? 'bg-destructive/10 text-destructive'
                    : liveMicKey === 'call.mic.off'
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-accent text-primary',
                )}
              >
                <span
                  className={cn(
                    'size-1.5 rounded-full',
                    liveMicKey === 'call.mic.denied'
                      ? 'bg-destructive'
                      : liveMicKey === 'call.mic.off'
                        ? 'bg-muted-foreground'
                        : 'bg-primary',
                  )}
                />
                {t(liveMicKey)}
              </span>
            </span>
            <p className="hidden font-mono text-xs text-muted-foreground md:block" title={routeText}>
              {routeText}
            </p>
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

          {micError && (
            <div role="alert" className="flex flex-col items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <p>
                {micError === 'not-allowed' || micError === 'service-not-allowed'
                  ? t('call.mic.denied')
                  : t('call.recognition.error')}
              </p>
              <Button size="sm" variant="secondary" onClick={startListening}>
                {t('call.mic.retry')}
              </Button>
            </div>
          )}

          {/* Live-caption view, not a growing chat log: only the current line is ever shown, replaced
              turn by turn (spec §3.1) — the full transcript still exists internally (askTutor context,
              corrections, end-of-call scoring, and the saved Historique record), it's just not
              rendered here. aria-live carries the requirement forward onto this single region. */}
          <div aria-live="polite" className="flex w-full max-w-xl flex-col gap-3">
            {lastTutorTurn && (
              <div className="w-full rounded-2xl border border-border bg-card px-5 py-4">
                <p className="label-caps text-primary">{t('call.camilleSays')}</p>
                <p className="mt-1.5 font-serif leading-relaxed">« {lastTutorTurn.text} »</p>
                {translations[lastTutorTurn.text] && (
                  <p className="mt-1 text-sm text-muted-foreground italic">
                    {translations[lastTutorTurn.text]}
                  </p>
                )}
              </div>
            )}

            {interimText && (
              <p className="w-full rounded-2xl bg-muted px-5 py-3 text-sm text-muted-foreground">
                {interimText}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 border-t border-border px-6 py-6">
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
        </div>
      </main>

      <CallInsights corrections={corrections} />
    </div>
  )
}
