import { useState } from 'react'
import { Loader2, MessageCircleQuestion, Send } from 'lucide-react'
import { Button } from './ui/button'
import { useLocale } from '../lib/i18n/LocaleContext'
import { tutorRequest } from '../lib/llm'
import { llmErrorKey } from '../lib/errors'

// The learner's side of "Ask your AI tutor" (spec §3.2.7) — a free-form, stateless Q&A with the
// lesson's chosen AI provider ("what's the difference between 'à mon avis' and 'selon moi'?").
// This is the ONE deliberate text input in the app: it's user-initiated comprehension Q&A, not an
// exercise, so the tap-or-speak-only rule (§3.2.2) governs exercise interaction and evaluation but
// not this panel. Questions are capped client-side and re-bounded server-side; answers are
// generated instructor text in the current UI locale and rendered raw (never through `t()`).
const MAX_QUESTION_CHARS = 300

export default function LessonAsk({ lesson, currentItem }) {
  const { t, locale } = useLocale()
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState([]) // [{ q, a }] or [{ q, errorKey }]
  const [loading, setLoading] = useState(false)

  const ask = async (raw) => {
    const q = raw.trim()
    if (!q || loading) return
    setLoading(true)
    const { ok, data } = await tutorRequest({
      type: 'ask',
      question: q,
      lessonTitle: lesson?.title ?? '',
      itemTerm: currentItem?.word ?? currentItem?.phrase ?? currentItem?.title ?? '',
      locale,
    })
    setMessages((prev) => [
      ...prev,
      ok && data?.answer
        ? { q, a: data.answer }
        : { q, errorKey: llmErrorKey(data?.error) },
    ])
    setLoading(false)
  }

  return (
    <section className="rounded-xl border border-border bg-card px-5 py-4">
      <p className="label-caps text-primary">
        <MessageCircleQuestion className="mr-1.5 inline size-3.5" />
        {t('lesson.ask.title')}
      </p>

      <div className="mt-3 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className="space-y-1.5">
            <p className="rounded-lg bg-muted px-3 py-2 text-sm font-medium">{m.q}</p>
            {m.a ? (
              <p className="whitespace-pre-line px-1 text-sm text-muted-foreground">{m.a}</p>
            ) : (
              <p role="alert" className="px-1 text-sm text-destructive">
                {t(m.errorKey)}
              </p>
            )}
          </div>
        ))}

        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void ask(question)
            setQuestion('')
          }}
        >
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={MAX_QUESTION_CHARS}
            rows={2}
            disabled={loading}
            aria-label={t('lesson.ask.placeholder')}
            placeholder={t('lesson.ask.placeholder')}
            className="min-w-0 flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <Button type="submit" disabled={loading || !question.trim()}>
            {loading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="size-4" aria-hidden="true" />
            )}
            {t('lesson.ask.button')}
          </Button>
        </form>
      </div>
    </section>
  )
}