import { memo } from 'react'
import { useElapsedSeconds } from '@/hooks/useElapsedSeconds'
import { isSameDay } from '@/lib/calendar'
import {
  DIAL,
  MINUTES_IN_DAY,
  clamp,
  dateFromDayMinute,
  describeArc,
  minuteOfDay,
  minuteToAngle,
  type DialArc,
  type DialEventArc,
} from '@/lib/clockCalendar'
import { toSafeHexColor } from '@/lib/color'
import { cn, formatDurationHMS, formatTime } from '@/lib/utils'
import type { TimeEntry } from '@/types'

const R = 200
const CX = 200
const CY = 200

interface DialDraft {
  startMinute: number
  endMinute: number
}

type ArcPart = 'body' | 'start' | 'end'

interface ClockDialProps {
  dayStart: Date
  arcs: DialArc[]
  eventArcs?: DialEventArc[]
  activeEntry: TimeEntry | null
  draft?: DialDraft | null
  draftColor?: string
  hiddenEntryId?: string | null
  focusedArcId?: string | null
  size?: 'full' | 'compact'
  interactive?: boolean
  nowMinute?: number
  onArcPointerDown?: (arc: DialArc, part: ArcPart, event: React.PointerEvent) => void
  onArcActivate?: (arc: DialArc) => void
  onArcDelete?: (arc: DialArc) => void
  onArcFocusChange?: (arcId: string | null) => void
  onTrackPointerDown?: (event: React.PointerEvent<SVGSVGElement>) => void
  centerPrimary: React.ReactNode
  centerSecondary?: React.ReactNode
  svgRef?: React.Ref<SVGSVGElement>
}

function polar(radius: number, angle: number) {
  return { x: CX + radius * Math.cos(angle), y: CY + radius * Math.sin(angle) }
}

function arcLabelText(arc: DialArc, radius: number, fontSize: number): string | null {
  const sweepMinutes = arc.endMinute - arc.startMinute
  if (sweepMinutes < 60) {
    return null
  }

  const arcLengthPx = radius * (sweepMinutes / MINUTES_IN_DAY) * Math.PI * 2
  const maxChars = Math.floor(arcLengthPx / (fontSize * 0.6))
  if (maxChars < 4) {
    return null
  }

  return arc.label.length > maxChars
    ? `${arc.label.slice(0, Math.max(1, maxChars - 1))}…`
    : arc.label
}

function timeLabel(dayStart: Date, minute: number): string {
  return formatTime(dateFromDayMinute(dayStart, minute).toISOString())
}

interface ClockDialStaticProps {
  dayStart: Date
  arcs: DialArc[]
  eventArcs: DialEventArc[]
  draft: DialDraft | null
  draftColor: string
  hiddenEntryId: string | null
  focusedArcId: string | null
  compact: boolean
  interactive: boolean
  nowMinute: number
  onArcPointerDown?: ClockDialProps['onArcPointerDown']
  onArcActivate?: ClockDialProps['onArcActivate']
  onArcDelete?: ClockDialProps['onArcDelete']
  onArcFocusChange?: ClockDialProps['onArcFocusChange']
  centerPrimary: React.ReactNode
  centerSecondary?: React.ReactNode
}

const ClockDialStatic = memo(function ClockDialStatic({
  dayStart,
  arcs,
  eventArcs,
  draft,
  draftColor,
  hiddenEntryId,
  focusedArcId,
  compact,
  interactive,
  nowMinute,
  onArcPointerDown,
  onArcActivate,
  onArcDelete,
  onArcFocusChange,
  centerPrimary,
  centerSecondary,
}: ClockDialStaticProps) {
  const arcStrokeWidth = R * DIAL.arcStroke
  const fontSize = compact ? 8 : 10

  const majors = [0, 6, 12, 18]

  return (
    <g>
      <circle
        cx={CX}
        cy={CY}
        r={R * 0.86}
        fill="none"
        strokeWidth={R * 0.28}
        className="stroke-secondary"
        aria-hidden="true"
      />

      {nowMinute < MINUTES_IN_DAY ? (
        <path
          d={describeArc(CX, CY, R * 0.86, nowMinute, MINUTES_IN_DAY)}
          fill="none"
          strokeWidth={R * 0.28}
          stroke="var(--background)"
          strokeOpacity={0.72}
          aria-hidden="true"
        />
      ) : null}

      {Array.from({ length: 24 }, (_, hour) => {
        const major = majors.includes(hour)
        const angle = minuteToAngle(hour * 60)
        const inner = polar(R * DIAL.tickInner, angle)
        const outer = polar(R * (major ? 0.5 : DIAL.tickOuter), angle)
        return (
          <line
            key={`tick-${hour}`}
            x1={inner.x}
            y1={inner.y}
            x2={outer.x}
            y2={outer.y}
            strokeWidth={major ? 2 : 1}
            className={major ? 'stroke-muted-foreground/50' : 'stroke-muted-foreground/25'}
            aria-hidden="true"
          />
        )
      })}

      {[0, 6, 12, 18].map((hour) => {
        const point = polar(R * DIAL.numeralRadius, minuteToAngle(hour * 60))
        return (
          <text
            key={`numeral-${hour}`}
            x={point.x}
            y={point.y}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-foreground select-none"
            style={{ fontSize: compact ? 11 : 16, fontWeight: 600 }}
            aria-hidden="true"
          >
            {String(hour).padStart(2, '0')}
          </text>
        )
      })}

      {!compact
        ? [3, 9, 15, 21].map((hour) => {
            const point = polar(R * DIAL.numeralRadius, minuteToAngle(hour * 60))
            return (
              <text
                key={`numeral-${hour}`}
                x={point.x}
                y={point.y}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-muted-foreground/60 select-none"
                style={{ fontSize: 10 }}
                aria-hidden="true"
              >
                {String(hour).padStart(2, '0')}
              </text>
            )
          })
        : null}

      {eventArcs.map((arc) => (
        <g key={`google-${arc.event.id}`} aria-hidden="true" opacity={0.55}>
          <path
            d={describeArc(CX, CY, R * DIAL.googleRing, arc.startMinute, arc.endMinute)}
            fill="none"
            stroke={arc.color}
            strokeWidth={R * DIAL.googleStroke}
            strokeLinecap="round"
          />
          <title>{arc.event.title}</title>
        </g>
      ))}

      {arcs.map((arc) => {
        if (arc.entry.id === hiddenEntryId) {
          return null
        }

        const laneIndex = Math.min(arc.lane, DIAL.laneRadius.length - 1)
        const radius = R * DIAL.laneRadius[laneIndex]
        const pathId = `dial-arc-${arc.entry.id}`
        const path = describeArc(CX, CY, radius, arc.startMinute, arc.endMinute)
        const label = arcLabelText(arc, radius, fontSize)
        const startPoint = polar(radius, minuteToAngle(arc.startMinute))
        const endPoint = polar(radius, minuteToAngle(arc.endMinute))
        const isFocused = focusedArcId === arc.entry.id
        const projectName = arc.entry.projects?.name ?? 'No project'
        const ariaLabel = `${arc.label}, ${projectName}, ${timeLabel(dayStart, arc.startMinute)} to ${timeLabel(dayStart, arc.endMinute)}`

        return (
          <g
            key={arc.entry.id}
            data-dial-arc
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={interactive ? ariaLabel : undefined}
            aria-pressed={interactive ? isFocused : undefined}
            className={cn('group outline-none', interactive && 'cursor-grab')}
            onFocus={interactive ? () => onArcFocusChange?.(arc.entry.id) : undefined}
            onBlur={interactive ? () => onArcFocusChange?.(null) : undefined}
            onPointerEnter={interactive ? () => onArcFocusChange?.(arc.entry.id) : undefined}
            onPointerLeave={interactive ? () => onArcFocusChange?.(null) : undefined}
            onKeyDown={
              interactive
                ? (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onArcActivate?.(arc)
                    } else if (event.key === 'Delete' || event.key === 'Backspace') {
                      event.preventDefault()
                      onArcDelete?.(arc)
                    }
                  }
                : undefined
            }
          >
            <path
              id={pathId}
              d={path}
              fill="none"
              stroke={arc.color}
              strokeWidth={arcStrokeWidth}
              strokeLinecap="round"
            />
            {label ? (
              <text
                className="pointer-events-none select-none fill-foreground"
                style={{ fontSize, fontWeight: 600 }}
                aria-hidden="true"
              >
                <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
                  {label}
                </textPath>
              </text>
            ) : null}
            {interactive ? (
              <>
                <path
                  d={path}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={arcStrokeWidth + R * 0.06}
                  strokeLinecap="round"
                  aria-hidden="true"
                  onPointerDown={(event) => {
                    event.stopPropagation()
                    onArcPointerDown?.(arc, 'body', event)
                  }}
                />
                <circle
                  cx={startPoint.x}
                  cy={startPoint.y}
                  r={R * 0.035}
                  strokeWidth={1.5}
                  className="fill-background stroke-foreground/50 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100"
                  aria-hidden="true"
                  onPointerDown={(event) => {
                    event.stopPropagation()
                    onArcPointerDown?.(arc, 'start', event)
                  }}
                />
                <circle
                  cx={endPoint.x}
                  cy={endPoint.y}
                  r={R * 0.035}
                  strokeWidth={1.5}
                  className="fill-background stroke-foreground/50 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100"
                  aria-hidden="true"
                  onPointerDown={(event) => {
                    event.stopPropagation()
                    onArcPointerDown?.(arc, 'end', event)
                  }}
                />
              </>
            ) : null}
          </g>
        )
      })}

      {draft ? (
        <path
          d={describeArc(CX, CY, R * DIAL.laneRadius[0], draft.startMinute, draft.endMinute)}
          fill="none"
          stroke={draftColor}
          strokeWidth={arcStrokeWidth}
          strokeLinecap="round"
          strokeOpacity={0.75}
          aria-hidden="true"
        />
      ) : null}

      <text
        x={CX}
        y={CY - (centerSecondary ? 6 : 0)}
        textAnchor="middle"
        dominantBaseline="middle"
        aria-live="polite"
        className="fill-foreground font-medium"
        style={{ fontSize: compact ? 13 : 20 }}
      >
        {centerPrimary}
      </text>
      {centerSecondary ? (
        <text
          x={CX}
          y={CY + 18}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-muted-foreground"
          style={{ fontSize: compact ? 8 : 11 }}
          aria-hidden="true"
        >
          {centerSecondary}
        </text>
      ) : null}
    </g>
  )
})

interface ClockDialLiveProps {
  activeEntry: TimeEntry | null
  dayStart: Date
  onArcActivate?: (arc: DialArc) => void
}

function ClockDialLive({ activeEntry, dayStart, onArcActivate }: ClockDialLiveProps) {
  const elapsed = useElapsedSeconds(activeEntry?.started_at)
  const now = new Date()
  const dayEnd = dateFromDayMinute(dayStart, MINUTES_IN_DAY)
  const isToday = isSameDay(dayStart, now)
  const nowMinute = clamp(minuteOfDay(now, dayStart), 0, MINUTES_IN_DAY)

  let liveArc: DialArc | null = null
  if (activeEntry) {
    const start = new Date(activeEntry.started_at)
    const visibleStart = start > dayStart ? start : dayStart
    const visibleEnd = now < dayEnd ? now : dayEnd

    if (visibleEnd > visibleStart) {
      const startMinute = clamp(minuteOfDay(visibleStart, dayStart), 0, MINUTES_IN_DAY)
      const endMinute = clamp(minuteOfDay(visibleEnd, dayStart), 0, MINUTES_IN_DAY)
      if (endMinute > startMinute) {
        liveArc = {
          entry: activeEntry,
          startMinute,
          endMinute,
          lane: 0,
          isRunning: true,
          label:
            activeEntry.description?.trim() ||
            activeEntry.projects?.name?.trim() ||
            'Running',
          color: toSafeHexColor(activeEntry.projects?.color, '#e76f51'),
        }
      }
    }
  }

  return (
    <g>
      {liveArc ? (
        <g
          data-dial-arc
          role={onArcActivate ? 'button' : undefined}
          tabIndex={onArcActivate ? 0 : undefined}
          aria-label={`Running timer: ${liveArc.label}, ${formatDurationHMS(elapsed)}`}
          className="cursor-pointer outline-none"
          onClick={() => onArcActivate?.(liveArc as DialArc)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onArcActivate?.(liveArc as DialArc)
            }
          }}
        >
          <path
            d={describeArc(
              CX,
              CY,
              R * DIAL.laneRadius[0],
              liveArc.startMinute,
              Math.max(liveArc.endMinute, liveArc.startMinute + 0.5)
            )}
            fill="none"
            stroke={liveArc.color}
            strokeWidth={R * DIAL.arcStroke}
            strokeLinecap="round"
            className="motion-safe:animate-pulse"
          />
        </g>
      ) : null}

      {isToday ? (
        <line
          x1={CX}
          y1={CY}
          x2={CX + R * DIAL.handLength * Math.cos(minuteToAngle(nowMinute))}
          y2={CY + R * DIAL.handLength * Math.sin(minuteToAngle(nowMinute))}
          className="stroke-destructive"
          strokeWidth={2}
          strokeLinecap="round"
          aria-hidden="true"
        />
      ) : null}
    </g>
  )
}

export default function ClockDial({
  dayStart,
  arcs,
  eventArcs = [],
  activeEntry,
  draft = null,
  draftColor = '#eab308',
  hiddenEntryId = null,
  focusedArcId = null,
  size = 'full',
  interactive = false,
  nowMinute = MINUTES_IN_DAY,
  onArcPointerDown,
  onArcActivate,
  onArcDelete,
  onArcFocusChange,
  onTrackPointerDown,
  centerPrimary,
  centerSecondary,
  svgRef,
}: ClockDialProps) {
  const compact = size === 'compact'
  const label = dayStart.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 400 400"
      role="group"
      aria-label={`24-hour clock for ${label}`}
      className={cn(
        'block touch-none select-none',
        compact ? 'w-full max-w-[240px]' : 'w-full max-w-md'
      )}
      onPointerDown={interactive ? onTrackPointerDown : undefined}
    >
      <ClockDialStatic
        dayStart={dayStart}
        arcs={arcs}
        eventArcs={eventArcs}
        draft={draft}
        draftColor={draftColor}
        hiddenEntryId={hiddenEntryId}
        focusedArcId={focusedArcId}
        compact={compact}
        interactive={interactive}
        nowMinute={nowMinute}
        onArcPointerDown={onArcPointerDown}
        onArcActivate={onArcActivate}
        onArcDelete={onArcDelete}
        onArcFocusChange={onArcFocusChange}
        centerPrimary={centerPrimary}
        centerSecondary={centerSecondary}
      />
      <ClockDialLive
        activeEntry={activeEntry}
        dayStart={dayStart}
        onArcActivate={onArcActivate}
      />
    </svg>
  )
}
