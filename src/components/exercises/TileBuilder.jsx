import { useMemo, useState } from 'react'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Ordered word-tile construction for "production" exercises (spec §3.2.2) — tap tiles (correct
// words + a few distractors) in order to build the sentence, tap a tile in the built strip to
// send it back. No typing. Parent must render this with `key={exercise.id}` so shuffling and the
// tapped-tile state reset cleanly on a new exercise, rather than needing extra reset effects here.
export default function TileBuilder({ tiles, disabled, onChange }) {
  const shuffled = useMemo(() => shuffle(tiles).map((word, id) => ({ id, word })), [tiles])
  const [usedIds, setUsedIds] = useState([])

  const emit = (ids) => onChange(ids.map((id) => shuffled[id].word).join(' '))

  const tap = (id) => {
    const next = [...usedIds, id]
    setUsedIds(next)
    emit(next)
  }

  const untap = (id) => {
    const next = usedIds.filter((tid) => tid !== id)
    setUsedIds(next)
    emit(next)
  }

  const bankTiles = shuffled.filter((t) => !usedIds.includes(t.id))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 p-2">
        {usedIds.length === 0 && <span className="px-1 text-sm text-muted-foreground">…</span>}
        {usedIds.map((id) => (
          <button
            key={id}
            type="button"
            disabled={disabled}
            onClick={() => untap(id)}
            className="rounded-md border border-primary/40 bg-accent/60 px-3 py-1.5 text-sm disabled:cursor-not-allowed"
          >
            {shuffled[id].word}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {bankTiles.map((tile) => (
          <button
            key={tile.id}
            type="button"
            disabled={disabled}
            onClick={() => tap(tile.id)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-muted disabled:cursor-not-allowed"
          >
            {tile.word}
          </button>
        ))}
      </div>
    </div>
  )
}
