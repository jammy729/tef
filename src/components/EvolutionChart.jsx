// ponytail: hand-rolled SVG line — spec §5 rules out a new chart dependency for one
// 8-point trend line. Swap for a real library only if charts grow more complex.
const WIDTH = 760
const HEIGHT = 220
const PAD = 24

export default function EvolutionChart({ points, labels, ariaLabel }) {
  const step = (WIDTH - PAD * 2) / Math.max(1, points.length - 1)
  const coords = points.map((v, i) => [PAD + i * step, PAD + (1 - v) * (HEIGHT - PAD * 2)])
  const path = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ')

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT + 24}`} className="w-full" role="img" aria-label={ariaLabel}>
        <line x1={PAD} y1={PAD} x2={WIDTH - PAD} y2={PAD} stroke="var(--border)" strokeWidth="1" />
        <line
          x1={PAD}
          y1={HEIGHT / 2}
          x2={WIDTH - PAD}
          y2={HEIGHT / 2}
          stroke="var(--border)"
          strokeWidth="1"
        />
        <line
          x1={PAD}
          y1={HEIGHT - PAD}
          x2={WIDTH - PAD}
          y2={HEIGHT - PAD}
          stroke="var(--border)"
          strokeWidth="1"
        />
        <text x={0} y={PAD + 4} className="fill-muted-foreground" fontSize="12">
          C1
        </text>
        <text x={0} y={HEIGHT / 2 + 4} className="fill-muted-foreground" fontSize="12">
          B2
        </text>
        <text x={0} y={HEIGHT - PAD + 4} className="fill-muted-foreground" fontSize="12">
          B1
        </text>
        <path d={path} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="4" fill="var(--primary)" />
        ))}
        {labels.map((label, i) => (
          <text
            key={label}
            x={coords[i][0]}
            y={HEIGHT + 18}
            textAnchor="middle"
            fontSize="12"
            className="fill-muted-foreground"
          >
            {label}
          </text>
        ))}
      </svg>
    </div>
  )
}
