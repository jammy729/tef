// Maps an LLM proxy error code to the i18n key for the message shown to the learner (spec §7:
// distinguish free-tier quota exhaustion from a generic connectivity failure, steer to the
// Roadmap either way since it doesn't call the LLM).
export function llmErrorKey(error) {
  return error === 'quota_exceeded' ? 'error.quotaExceeded' : 'error.llmUnavailable'
}
