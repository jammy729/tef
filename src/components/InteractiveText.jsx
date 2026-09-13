import { useMemo, useState } from 'react'
import { Volume2 } from 'lucide-react'

// Module-level cache — translations are cheap/tiny (spec §5) but no need to re-fetch the same
// word/sentence twice in a session.
const translationCache = new Map()

async function fetchTranslation(text) {
  if (translationCache.has(text)) return translationCache.get(text)
  try {
    const res = await fetch('/api/tutor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'translate', text }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || data.error) return null
    translationCache.set(text, data.translation)
    return data.translation
  } catch {
    return null
  }
}

function speak(text) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'fr-FR'
  const voices = window.speechSynthesis.getVoices()
  const voice = voices.find((v) => v.lang === 'fr-FR') ?? voices.find((v) => v.lang?.startsWith('fr'))
  if (voice) utterance.voice = voice
  window.speechSynthesis.speak(utterance)
}

// Splits into word tokens and non-word tokens (spaces/punctuation) — only word tokens are
// clickable. Handles accented French letters and apostrophes/hyphens inside words.
function tokenize(text) {
  return text.match(/[A-Za-zÀ-ÖØ-öø-ÿ'-]+|[^A-Za-zÀ-ÖØ-öø-ÿ'-]+/g) ?? []
}

function isWord(token) {
  return /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(token)
}

// Spec §3.3.2 — click/hover a word to hear + translate it, click/hover a sentence to hear +
// translate the whole thing. Playback is the browser's speechSynthesis directly (no pre-recorded
// audio); translation goes through the LLM proxy's `translate` request type.
export default function InteractiveText({ passage }) {
  const [wordPopover, setWordPopover] = useState(null)
  const [sentenceTranslations, setSentenceTranslations] = useState({})
  const [openSentence, setOpenSentence] = useState(null)

  const sentences = useMemo(
    () => (passage.match(/[^.!?]+[.!?]*/g) ?? [passage]).map((s) => s.trim()).filter(Boolean),
    [passage],
  )

  const handleWordClick = async (token) => {
    speak(token)
    setWordPopover({ token, translation: null, loading: true })
    const translation = await fetchTranslation(token)
    setWordPopover((prev) => (prev?.token === token ? { token, translation, loading: false } : prev))
  }

  const handleSentencePlay = async (sentence) => {
    speak(sentence)
    setOpenSentence(sentence)
    if (!sentenceTranslations[sentence]) {
      const translation = await fetchTranslation(sentence)
      if (translation) setSentenceTranslations((prev) => ({ ...prev, [sentence]: translation }))
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {sentences.map((sentence) => (
        <div key={sentence} className="flex items-start gap-2">
          <button
            type="button"
            onClick={() => handleSentencePlay(sentence)}
            aria-label={`Play: ${sentence}`}
            className="mt-1 shrink-0 rounded-full p-1 text-primary hover:bg-accent"
          >
            <Volume2 className="size-4" />
          </button>
          <div className="flex-1">
            <p className="font-serif leading-relaxed">
              {tokenize(sentence).map((token, j) =>
                isWord(token) ? (
                  <button
                    key={j}
                    type="button"
                    onClick={() => handleWordClick(token)}
                    aria-label={`${token} — hear and translate`}
                    className="rounded hover:bg-accent hover:text-primary"
                  >
                    {token}
                  </button>
                ) : (
                  <span key={j}>{token}</span>
                ),
              )}
            </p>
            {openSentence === sentence && sentenceTranslations[sentence] && (
              <p className="mt-1 text-sm text-muted-foreground italic">
                {sentenceTranslations[sentence]}
              </p>
            )}
          </div>
        </div>
      ))}

      {wordPopover && (
        <div role="status" className="w-fit rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <span className="font-medium">{wordPopover.token}</span>{' '}
          {wordPopover.loading ? '…' : wordPopover.translation ? `— ${wordPopover.translation}` : ''}
        </div>
      )}
    </div>
  )
}
