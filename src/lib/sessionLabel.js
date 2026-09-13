import { TASK_A_SCENARIOS, TASK_B_SCENARIOS } from '../content/scenarios'

const TASK_MODES = ['taskA', 'taskB', 'mock']

// Human label for a call session's mode/scenario, for Historique/Progress display — spec §3.2.2.
export function callSessionLabel(session, t, locale) {
  if (TASK_MODES.includes(session.mode)) {
    const list = session.mode === 'taskB' ? TASK_B_SCENARIOS : TASK_A_SCENARIOS
    const scenario = list.find((s) => s.id === session.scenarioId)
    const modeLabel = t(`call.mode.${session.mode}`)
    return scenario ? `${modeLabel} — ${scenario[locale] ?? scenario.en}` : modeLabel
  }
  const topicKey = session.mode === 'free' || !session.mode ? 'free' : session.mode
  return t(`objectif.topics.${topicKey}.title`)
}
