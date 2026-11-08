import {
  FACE_RADIUS,
  INNER_DOT_RADIUS,
  NUMERAL_RADIUS,
  OUTER_DOT_RADIUS,
  handAnglesFromDate,
  minutesToAngle,
  polarToCartesian,
  MINUTES_IN_PERIOD,
} from '@/lib/clockCalendar'

interface ClockFaceProps {
  cx: number
  cy: number
  size: number
  now: Date | null
  faceRotationDeg?: number
  showHands?: boolean
}

const NUMERALS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

function DotRing({
  cx,
  cy,
  size,
  radiusFactor,
  count = 60,
}: {
  cx: number
  cy: number
  size: number
  radiusFactor: number
  count?: number
}) {
  const radius = size * radiusFactor
  const dots = []

  for (let i = 0; i < count; i += 1) {
    const angle = minutesToAngle((i / count) * MINUTES_IN_PERIOD)
    const point = polarToCartesian(cx, cy, radius, angle)
    const isMajor = i % 5 === 0
    dots.push(
      <circle
        key={`${radiusFactor}-${i}`}
        cx={point.x}
        cy={point.y}
        r={isMajor ? size * 0.008 : size * 0.005}
        className={isMajor ? 'fill-foreground/55' : 'fill-foreground/25'}
      />
    )
  }

  return <g aria-hidden="true">{dots}</g>
}

export default function ClockFace({
  cx,
  cy,
  size,
  now,
  faceRotationDeg = 0,
  showHands = true,
}: ClockFaceProps) {
  const faceRadius = size * FACE_RADIUS
  const numeralRadius = size * NUMERAL_RADIUS
  const hands = now ? handAnglesFromDate(now) : null

  return (
    <g
      style={{
        transform: `rotate(${faceRotationDeg}deg)`,
        transformOrigin: `${cx}px ${cy}px`,
      }}
    >
      <circle
        cx={cx}
        cy={cy}
        r={faceRadius}
        className="fill-transparent"
      />

      {NUMERALS.map((numeral, index) => {
        const angle = minutesToAngle((index / 12) * MINUTES_IN_PERIOD)
        const point = polarToCartesian(cx, cy, numeralRadius, angle)
        return (
          <text
            key={numeral}
            x={point.x}
            y={point.y}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-foreground select-none"
            style={{ fontSize: size * 0.055, fontWeight: 500 }}
          >
            {numeral}
          </text>
        )
      })}

      <DotRing cx={cx} cy={cy} size={size} radiusFactor={INNER_DOT_RADIUS} />
      <DotRing cx={cx} cy={cy} size={size} radiusFactor={OUTER_DOT_RADIUS} />

      {[0, 3, 6, 9].map((hour) => {
        const angle = minutesToAngle((hour / 12) * MINUTES_IN_PERIOD)
        const inner = polarToCartesian(cx, cy, size * 0.28, angle)
        const outer = polarToCartesian(cx, cy, size * 0.48, angle)
        return (
          <line
            key={`tick-${hour}`}
            x1={inner.x}
            y1={inner.y}
            x2={outer.x}
            y2={outer.y}
            className="stroke-muted-foreground/30"
            strokeWidth={1}
            aria-hidden="true"
          />
        )
      })}

      {showHands && hands ? (
        <g aria-hidden="true">
          <line
            x1={cx}
            y1={cy}
            x2={polarToCartesian(cx, cy, size * 0.2, hands.hour).x}
            y2={polarToCartesian(cx, cy, size * 0.2, hands.hour).y}
            className="stroke-foreground"
            strokeWidth={size * 0.018}
            strokeLinecap="round"
          />
          <line
            x1={cx}
            y1={cy}
            x2={polarToCartesian(cx, cy, size * 0.28, hands.minute).x}
            y2={polarToCartesian(cx, cy, size * 0.28, hands.minute).y}
            className="stroke-foreground"
            strokeWidth={size * 0.012}
            strokeLinecap="round"
          />
          <line
            x1={cx}
            y1={cy}
            x2={polarToCartesian(cx, cy, size * 0.3, hands.second).x}
            y2={polarToCartesian(cx, cy, size * 0.3, hands.second).y}
            className="stroke-destructive"
            strokeWidth={size * 0.005}
            strokeLinecap="round"
          />
          <circle cx={cx} cy={cy} r={size * 0.012} className="fill-destructive" />
        </g>
      ) : null}
    </g>
  )
}
