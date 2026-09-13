// Single client entry point to the LLM proxy (api/tutor.js). Every /api/tutor call goes through
// here so the selected provider + bring-your-own-key (settings screen) is always included, and so
// network failures map to the same { error } shape the UI already understands.
import { llmRequestMeta } from './settings'

export async function tutorRequest(payload) {
  let res
  try {
    res = await fetch('/api/tutor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...llmRequestMeta(), ...payload }),
    })
  } catch {
    return { ok: false, data: { error: 'llm_unavailable' } }
  }
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok && !data.error, data }
}