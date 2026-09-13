import { cn } from '../../lib/utils'

// Single-select tappable chip group — shared by multiple_choice, fill_blank, and translation
// exercises (spec §3.2.2). No typing anywhere in the exercise engine.
export default function ChoiceBank({ options, selected, disabled, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(option)}
          aria-pressed={selected === option}
          className={cn(
            'rounded-lg border px-4 py-2.5 text-left text-sm transition-colors disabled:cursor-not-allowed',
            selected === option ? 'border-primary bg-accent/60' : 'border-border bg-background hover:bg-muted',
          )}
        >
          {option}
        </button>
      ))}
    </div>
  )
}
