import { useState } from 'react'
import { useLocale } from '../lib/i18n/LocaleContext'
import ChoiceBank from './exercises/ChoiceBank'

// Turns a correction into a mini-lesson: the grammar rule, 2-3 examples, and a tap-only
// fill-in-the-blank to try — reused on Call's live corrections. No typing anywhere (spec §3.2.2).
export default function WhyExplain({ correction }) {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const [answer, setAnswer] = useState(null)

  if (!correction?.rule) return null

  const practice = correction.practice
  const correct = practice && answer === practice.answer

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-xs font-medium text-primary underline underline-offset-2"
      >
        {open ? t('why.hide') : t('why.button')}
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-2 rounded-lg bg-muted px-3 py-2.5 text-sm">
          <div>
            <p className="label-caps">{t('why.rule')}</p>
            <p className="mt-0.5">{correction.rule}</p>
          </div>
          {correction.examples?.length > 0 && (
            <div>
              <p className="label-caps">{t('why.examples')}</p>
              <ul className="mt-0.5 list-disc pl-4">
                {correction.examples.map((ex) => (
                  <li key={ex}>{ex}</li>
                ))}
              </ul>
            </div>
          )}
          {practice?.options?.length > 1 && (
            <div>
              <p className="label-caps">{t('why.practice')}</p>
              <p className="mt-0.5">{practice.prompt}</p>
              <div className="mt-1.5">
                <ChoiceBank options={practice.options} selected={answer} disabled={false} onSelect={setAnswer} />
              </div>
              {answer && (
                <p className={`mt-1 ${correct ? 'text-success' : 'text-destructive'}`}>
                  {correct ? t('drill.correct') : t('drill.incorrect', { answer: practice.answer })}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
