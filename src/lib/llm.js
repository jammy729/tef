// Single client entry point to the LLM proxy (api/tutor.js). Every /api/tutor call goes through
// here so the selected provider + bring-your-own-key (settings screen) is always included, and so
// network failures map to the same { error } shape the UI already understands.
import { llmRequestMeta } from './settings'
import { recordCall } from './usage'

export async function tutorRequest(payload) {
  const meta = llmRequestMeta()
  let res
  try {
    res = await fetch('/api/tutor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...meta, ...payload }),
    })
  } catch {
    return { ok: false, data: { error: 'llm_unavailable' } }
  }
  const data = await res.json().catch(() => ({}))
  // The request reached the proxy, so the provider was used (or attempted) — count it for the
  // Progress dashboard's usage card. Network failures above never count.
  if (typeof payload.type === 'string') recordCall(meta.provider, payload.type)
  return { ok: res.ok && !data.error, data }
}