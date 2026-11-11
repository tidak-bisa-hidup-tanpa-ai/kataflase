// Maskot "Kartu Kata": kartu kertas bermata, orisinal untuk Kataflase.
// Kartu biasa: krem dan lurus. Kartu impostor: pink, miring, dicetak geser.

const INK = 'var(--color-ink)'
const CARD = 'var(--color-card)'
const FLAME = 'var(--color-flame)'
const COBALT = 'var(--color-cobalt)'

const EYES = [
  [30, 44],
  [50, 44],
]

// Arah lirikan pupil per ekspresi.
const LOOK = {
  happy: [0, 0.5],
  wave: [0, 0.5],
  peek: [2.5, -2.5],
  whisper: [-3, 0.5],
  panic: [0, 0],
  caught: [0, 0],
  smug: [3, 1],
  confused: [-1.5, -1.5],
}

const MOUTHS = {
  happy: <path d="M31 61 Q40 71 49 61" />,
  wave: <path d="M31 61 Q40 71 49 61" />,
  peek: <circle cx="40" cy="64" r="3.2" fill={INK} stroke="none" />,
  whisper: <path d="M35 64 L44 64" />,
  panic: <path d="M29 65 q2.75 -4 5.5 0 t5.5 0 t5.5 0 t5.5 0" />,
  caught: <ellipse cx="40" cy="65" rx="4.5" ry="6" fill={INK} stroke="none" />,
  smug: <path d="M32 64 Q42 67 49 58" />,
  sleepy: <path d="M36 64 Q40 66 44 64" />,
  confused: <path d="M32 65 Q36 61 40 65 T48 64" />,
}

function Eye({ cx, cy, mood, body }) {
  if (mood === 'sleepy') {
    return <path d={`M${cx - 6} ${cy} Q${cx} ${cy + 5} ${cx + 6} ${cy}`} />
  }
  const [dx, dy] = LOOK[mood] ?? [0, 0]
  const big = mood === 'panic' || mood === 'caught'
  const r = big ? 8.5 : 7.5
  const pupil = big ? 2.4 : mood === 'confused' && cx < 40 ? 4 : 3.4
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#fff" />
      <circle cx={cx + dx} cy={cy + dy} r={pupil} fill={INK} stroke="none" />
      {mood === 'smug' && (
        // Kelopak setengah tertutup: tatapan licik.
        <path d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy} Z`} fill={body} />
      )}
    </g>
  )
}

export default function Mascot({
  mood = 'happy',
  impostor = false,
  word = '',
  className = 'w-20',
  title,
}) {
  const body = impostor ? FLAME : CARD
  const tilt = impostor ? -8 : mood === 'peek' ? 6 : 0

  return (
    <svg
      viewBox="-10 -10 110 120"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : 'true'}
      aria-label={title}
      fill="none"
      stroke={INK}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g transform={`rotate(${tilt} 40 50)`}>
        {impostor ? (
          // Cetakan geser: garis biru meleset dari kartu pink.
          <rect x="12" y="11" width="64" height="84" rx="10" stroke={COBALT} />
        ) : (
          <rect x="11" y="11" width="64" height="84" rx="10" fill={INK} stroke="none" />
        )}
        <rect x="8" y="8" width="64" height="84" rx="10" fill={body} />

        {mood === 'wave' && (
          <g>
            <path d="M71 58 L84 40" />
            <circle cx="86" cy="37" r="4.5" fill={body} />
          </g>
        )}
        {mood === 'whisper' && (
          <path d="M18 66 Q24 70 30 64" />
        )}

        {EYES.map(([cx, cy]) => (
          <Eye key={cx} cx={cx} cy={cy} mood={mood} body={body} />
        ))}
        {MOUTHS[mood]}

        {word && (
          <text
            x="40"
            y="84"
            textAnchor="middle"
            fill={INK}
            stroke="none"
            fontSize="12"
            fontWeight="800"
            fontFamily="'Bricolage Grotesque', sans-serif"
          >
            {word}
          </text>
        )}
      </g>

      {mood === 'panic' && (
        <path d="M80 18 q4 6 0 9 q-4 -3 0 -9 Z" fill={COBALT} stroke={INK} strokeWidth="2" />
      )}
      {mood === 'sleepy' && (
        <text x="74" y="14" fill={COBALT} stroke="none" fontSize="16" fontWeight="700" fontFamily="'JetBrains Mono', monospace">
          z
        </text>
      )}
      {mood === 'confused' && (
        <text x="74" y="16" fill={COBALT} stroke="none" fontSize="22" fontWeight="800" fontFamily="'Bricolage Grotesque', sans-serif">
          ?
        </text>
      )}
      {mood === 'whisper' && (
        <text x="74" y="40" fill={FLAME} stroke="none" fontSize="10" fontWeight="700" fontFamily="'JetBrains Mono', monospace">
          psst
        </text>
      )}
      {mood === 'smug' && (
        <path d="M84 12 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" fill="var(--color-sun)" strokeWidth="2" />
      )}
    </svg>
  )
}
