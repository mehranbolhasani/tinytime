import {
  ARC_RADIUS,
  ARC_RADIUS_LANE_1,
  describeArc,
  polarToCartesian,
  type ClockArc,
  type GoogleClockArc,
} from '@/lib/clockCalendar'
import { hexToRgba } from '@/lib/color'

interface EntryArcProps {
  arc: ClockArc
  cx: number
  cy: number
  size: number
  onSelect?: (arc: ClockArc) => void
  onPointerDownHandle?: (
    edge: 'start' | 'end',
    arc: ClockArc,
    event: React.PointerEvent
  ) => void
  onPointerDownBody?: (arc: ClockArc, event: React.PointerEvent) => void
  interactive?: boolean
}

interface GoogleArcProps {
  arc: GoogleClockArc
  cx: number
  cy: number
  size: number
}

function arcRadius(size: number, lane: 0 | 1): number {
  return size * (lane === 1 ? ARC_RADIUS_LANE_1 : ARC_RADIUS)
}

export function GoogleEntryArc({ arc, cx, cy, size }: GoogleArcProps) {
  const radius = size * (ARC_RADIUS + 0.08)
  const path = describeArc(cx, cy, radius, arc.startAngle, arc.endAngle)
  const pathId = `google-arc-${arc.event.id}`

  return (
    <g opacity={0.45} aria-hidden="true">
      <path
        id={pathId}
        d={path}
        fill="none"
        stroke={hexToRgba(arc.color, 0.35)}
        strokeWidth={size * 0.045}
        strokeLinecap="round"
      />
    </g>
  )
}

export default function EntryArc({
  arc,
  cx,
  cy,
  size,
  onSelect,
  onPointerDownHandle,
  onPointerDownBody,
  interactive = true,
}: EntryArcProps) {
  const radius = arcRadius(size, arc.lane)
  const path = describeArc(cx, cy, radius, arc.startAngle, arc.endAngle)
  const pathId = `entry-arc-${arc.entry.id}`
  const strokeWidth = size * 0.07
  const startHandle = polarToCartesian(cx, cy, radius, arc.startAngle)
  const endHandle = polarToCartesian(cx, cy, radius, arc.endAngle)
  const label = arc.label.length > 18 ? `${arc.label.slice(0, 16)}…` : arc.label

  return (
    <g>
      <path
        id={pathId}
        d={path}
        fill="none"
        stroke={hexToRgba(arc.color, arc.isLive ? 0.55 : 0.85)}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        className={interactive ? 'cursor-grab' : undefined}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-label={
          interactive
            ? `${arc.label}, ${new Date(arc.startMs).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} to ${new Date(arc.endMs).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
            : undefined
        }
        onKeyDown={(event) => {
          if (!interactive) return
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onSelect?.(arc)
          }
        }}
        onPointerDown={(event) => {
          if (!interactive || !onPointerDownBody) return
          event.stopPropagation()
          onPointerDownBody(arc, event)
        }}
      />
      {/* Wider invisible hit target */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={strokeWidth + size * 0.04}
        strokeLinecap="round"
        className={interactive ? 'cursor-grab' : undefined}
        onPointerDown={(event) => {
          if (!interactive || !onPointerDownBody) return
          event.stopPropagation()
          onPointerDownBody(arc, event)
        }}
        aria-hidden="true"
      />
      <text
        className="pointer-events-none select-none fill-foreground"
        style={{ fontSize: Math.max(10, size * 0.032), fontWeight: 600 }}
      >
        <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
          {label}
        </textPath>
      </text>

      {interactive && onPointerDownHandle ? (
        <>
          <circle
            cx={startHandle.x}
            cy={startHandle.y}
            r={size * 0.028}
            className="fill-background stroke-foreground/40"
            strokeWidth={1.5}
            style={{ cursor: 'grab', touchAction: 'none' }}
            aria-label={`Resize start of ${arc.label}`}
            onPointerDown={(event) => {
              event.stopPropagation()
              onPointerDownHandle('start', arc, event)
            }}
          />
          <circle
            cx={endHandle.x}
            cy={endHandle.y}
            r={size * 0.028}
            className="fill-background stroke-foreground/40"
            strokeWidth={1.5}
            style={{ cursor: 'grab', touchAction: 'none' }}
            aria-label={`Resize end of ${arc.label}`}
            onPointerDown={(event) => {
              event.stopPropagation()
              onPointerDownHandle('end', arc, event)
            }}
          />
        </>
      ) : null}
    </g>
  )
}

export function DraftArc({
  cx,
  cy,
  size,
  startAngle,
  endAngle,
  color = '#eab308',
  label,
}: {
  cx: number
  cy: number
  size: number
  startAngle: number
  endAngle: number
  color?: string
  label?: string
}) {
  const radius = size * ARC_RADIUS
  const path = describeArc(cx, cy, radius, startAngle, endAngle)
  const pathId = 'draft-arc-path'
  const startHandle = polarToCartesian(cx, cy, radius, startAngle)
  const endHandle = polarToCartesian(cx, cy, radius, endAngle)

  return (
    <g>
      <path
        id={pathId}
        d={path}
        fill="none"
        stroke={hexToRgba(color, 0.9)}
        strokeWidth={size * 0.07}
        strokeLinecap="round"
      />
      {label ? (
        <text
          className="pointer-events-none select-none fill-foreground"
          style={{ fontSize: Math.max(10, size * 0.032), fontWeight: 600 }}
        >
          <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
            {label}
          </textPath>
        </text>
      ) : null}
      <circle
        cx={startHandle.x}
        cy={startHandle.y}
        r={size * 0.032}
        className="fill-background/80 stroke-foreground/30"
        strokeWidth={1}
        aria-hidden="true"
      />
      <circle
        cx={startHandle.x}
        cy={startHandle.y}
        r={size * 0.01}
        className="fill-foreground"
        aria-hidden="true"
      />
      <circle
        cx={endHandle.x}
        cy={endHandle.y}
        r={size * 0.032}
        className="fill-background/80 stroke-foreground/30"
        strokeWidth={1}
        aria-hidden="true"
      />
      <circle
        cx={endHandle.x}
        cy={endHandle.y}
        r={size * 0.01}
        className="fill-foreground"
        aria-hidden="true"
      />
    </g>
  )
}
