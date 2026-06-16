import { useState } from 'react'
import type { Match, GoalEvent, CardEvent } from '../../types'
import { TEAM_MAP, isArgentina } from '../../data/teams'
import { Flag } from '../ui/Flag'
import { IconClock, IconPin } from '../ui/icons'
import { formatArgTime, formatArgDate, countdownTo, elapsedMinutes, effectiveStatus } from '../../lib/dateUtils'

const STAGE_LABELS: Record<string, string> = {
  group: 'Grupos', r32: 'Dieciseisavos', r16: 'Octavos',
  qf: 'Cuartos', sf: 'Semifinal', final: 'Final', third: '3.er Puesto',
}

interface Props { match: Match; now: number; style?: React.CSSProperties }

export function MatchCard({ match, now, style }: Props) {
  const home = TEAM_MAP.get(match.homeTeamId)
  const away = TEAM_MAP.get(match.awayTeamId)
  const [showInfo, setShowInfo] = useState(false)
  if (!home || !away) return null

  const status    = effectiveStatus(match.status, match.date, now)
  const isLive    = status === 'live'
  const isFinished = status === 'finished'
  const hasScore  = match.homeScore !== null && match.awayScore !== null
  const hasArg    = isArgentina(home.id) || isArgentina(away.id)
  const groupLabel = match.group ? `Grupo ${match.group}` : STAGE_LABELS[match.stage] ?? match.stage

  const rawMinute = match.minute ?? (isLive ? elapsedMinutes(match.date, now) : null)
  const extraMin  = match.extraMinute ?? null
  const hasPen    = match.homePenalties != null && match.awayPenalties != null
  const scorers   = match.scorers ?? []
  const cards     = match.cards ?? []
  const hasEvents = (isLive || isFinished) && (scorers.length > 0 || cards.length > 0)
  const hasPoss   = match.homePossession != null && match.awayPossession != null
  const hasInfo   = match.attendance != null || match.referee != null

  return (
    <div
      style={style}
      className={[
        'relative panel p-4 fade-up transition-all duration-200 hover:border-[var(--color-line-2)]',
        isLive ? 'border-[color-mix(in_srgb,var(--color-live)_40%,transparent)]' : '',
        hasArg ? 'arg-glow' : '',
      ].join(' ')}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <span className="text-[11px] font-medium text-ink-3 uppercase tracking-wide">{groupLabel}</span>
        <StatusBadge
          status={status} minute={rawMinute} extraMinute={extraMin}
          period={match.period ?? 1} isHalftime={match.isHalftime ?? false}
          aet={match.aet ?? false}
          homePenalties={match.homePenalties ?? null}
          awayPenalties={match.awayPenalties ?? null}
          date={match.date}
        />
      </div>

      {/* Teams + score */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <TeamCol team={home} />
        <div className="px-1 min-w-[72px] text-center">
          {(isFinished || isLive) && hasScore ? (
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center gap-1.5">
                <Score value={match.homeScore!} live={isLive} />
                <span className="text-ink-3 text-lg font-light -mt-0.5">:</span>
                <Score value={match.awayScore!} live={isLive} />
              </div>
              {hasPen && (
                <div className="text-[11px] text-ink-3 nums mt-0.5">
                  ({match.homePenalties} - {match.awayPenalties} pen.)
                </div>
              )}
            </div>
          ) : isFinished || isLive ? (
            <div className="text-ink-3 text-sm font-medium">{isLive ? 'en juego' : 'FT'}</div>
          ) : (
            <div className="leading-none">
              <div className="text-[19px] font-bold text-ink font-display nums">{formatArgTime(match.date)}</div>
              <div className="text-[10px] text-ink-3 mt-1">{formatArgDate(match.date)}</div>
            </div>
          )}
        </div>
        <TeamCol team={away} />
      </div>

      {/* Possession bar */}
      {(isLive || isFinished) && hasPoss && (
        <PossessionBar home={match.homePossession!} away={match.awayPossession!} />
      )}

      {/* Countdown */}
      {status === 'scheduled' && (
        <div className="mt-3 flex items-center justify-center">
          <span className="chip chip-soon"><IconClock size={12} /> {countdownTo(match.date, now)}</span>
        </div>
      )}

      {/* Events: goals + cards */}
      {hasEvents && (
        <MatchEvents
          scorers={scorers}
          cards={cards}
          homeTeamId={match.homeTeamId}
          awayTeamId={match.awayTeamId}
        />
      )}

      {/* Venue + info toggle */}
      <div className="mt-3 pt-3 border-t hairline">
        <div className="flex items-center justify-between text-[10.5px] text-ink-3">
          <span className="inline-flex items-center gap-1 truncate"><IconPin size={11} /> {match.venue}</span>
          <div className="flex items-center gap-2 ml-2 shrink-0">
            <span className="truncate">{match.city}</span>
            {hasInfo && (
              <button
                onClick={() => setShowInfo(v => !v)}
                className={`w-4 h-4 rounded-full border text-[9px] font-bold leading-none grid place-items-center cursor-pointer transition-colors ${showInfo ? 'border-[var(--color-grass)] text-[var(--color-grass)]' : 'border-[var(--color-line-2)] hover:border-ink-2'}`}
                title="Más info"
              >
                i
              </button>
            )}
          </div>
        </div>
        {showInfo && (match.referee || match.attendance != null) && (
          <div className="mt-2 pt-2 border-t hairline space-y-1 text-[11px] text-ink-3 fade-up">
            {match.referee && (
              <div className="flex items-center gap-1.5">
                <span className="text-ink-3 text-[10px]">◆</span>
                <span className="text-ink-2">{match.referee}</span>
                <span className="text-ink-3">árbitro</span>
              </div>
            )}
            {match.attendance != null && (
              <div className="flex items-center gap-1.5">
                <span className="text-ink-3 text-[10px]">▲</span>
                <span className="text-ink-2 nums">{match.attendance.toLocaleString('es-AR')}</span>
                <span className="text-ink-3">espectadores</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── sub-components ────────────────────────────────────────────────────────

function TeamCol({ team }: { team: NonNullable<ReturnType<typeof TEAM_MAP.get>> }) {
  const arg = isArgentina(team.id)
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <Flag team={team} size={32} />
      <span className={`text-[13px] font-medium leading-tight ${arg ? 'arg-text font-semibold' : 'text-ink'}`}>
        {team.shortName ?? team.name}{arg && ' ★'}
      </span>
    </div>
  )
}

function Score({ value, live }: { value: number; live: boolean }) {
  return (
    <span key={value}
      className={`score-pop text-[26px] font-bold font-display nums leading-none ${live ? 'text-white' : 'text-ink'}`}>
      {value}
    </span>
  )
}

function fmtMin(minute: number, extra: number | null | undefined): string {
  return extra != null ? `${minute}+${extra}'` : `${minute}'`
}

function StatusBadge({ status, minute, extraMinute, period, isHalftime, aet, homePenalties, awayPenalties, date }: {
  status: 'scheduled' | 'live' | 'finished'; minute: number | null; extraMinute: number | null
  period: number; isHalftime: boolean; aet: boolean
  homePenalties: number | null; awayPenalties: number | null; date: string
}) {
  if (status === 'live') {
    if (isHalftime) {
      return (
        <span className="chip" style={{ color: 'var(--color-gold)', background: 'color-mix(in srgb, var(--color-gold) 15%, transparent)' }}>
          ENTRETIEMPO
        </span>
      )
    }
    const minStr = minute != null ? ` · ${fmtMin(minute, extraMinute)}` : ''
    return (
      <span className="chip chip-live">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-live)] live-dot inline-block" />
        {period >= 3 ? 'TP ' : ''}EN VIVO{minStr}
      </span>
    )
  }
  if (status === 'finished') {
    if (homePenalties != null && awayPenalties != null)
      return <span className="chip chip-done">Penales · {homePenalties}-{awayPenalties}</span>
    if (aet) return <span className="chip chip-done">Fin. (TP)</span>
    return <span className="chip chip-done">Finalizado</span>
  }
  return <span className="text-[11px] text-ink-3 font-medium nums">{formatArgTime(date)} ART</span>
}

// ─── Possession bar ────────────────────────────────────────────────────────

function PossessionBar({ home, away }: { home: number; away: number }) {
  return (
    <div className="mt-3 pt-3 border-t hairline">
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-ink-2 nums w-7 text-right shrink-0">{Math.round(home)}%</span>
        <div className="flex-1 h-[5px] rounded-full overflow-hidden bg-[var(--color-line)]">
          <div className="h-full bg-[var(--color-grass)] rounded-full transition-all duration-500"
            style={{ width: `${home}%` }} />
        </div>
        <span className="text-[11px] text-ink-2 nums w-7 shrink-0">{Math.round(away)}%</span>
      </div>
      <p className="text-center text-[9px] text-ink-3 mt-0.5 uppercase tracking-wider">posesión</p>
    </div>
  )
}

// ─── Match events (goals + cards) ─────────────────────────────────────────

type TimelineItem =
  | { kind: 'goal'; minute: number; extra: number | null; playerName: string; isPenalty: boolean; isOwnGoal: boolean }
  | { kind: 'card'; minute: number; extra: number | null; playerName: string; isRed: boolean }

function toTimeline(scorers: GoalEvent[], cards: CardEvent[], teamId: string): TimelineItem[] {
  const goals: TimelineItem[] = scorers
    .filter(g => g.teamId === teamId)
    .map(g => ({ kind: 'goal', minute: g.minute, extra: g.extraMinute ?? null, playerName: g.playerName, isPenalty: !!g.isPenalty, isOwnGoal: !!g.isOwnGoal }))
  const cds: TimelineItem[] = cards
    .filter(c => c.teamId === teamId)
    .map(c => ({ kind: 'card', minute: c.minute, extra: c.extraMinute ?? null, playerName: c.playerName, isRed: c.isRed }))
  return [...goals, ...cds].sort((a, b) => a.minute - b.minute || (a.extra ?? 0) - (b.extra ?? 0))
}

function EventDot({ item }: { item: TimelineItem }) {
  if (item.kind === 'goal') {
    return <span className="text-[11px] shrink-0">⚽</span>
  }
  return (
    <span className="inline-block shrink-0"
      style={{
        width: 9, height: 12, borderRadius: 1,
        background: item.isRed ? 'var(--color-live)' : 'var(--color-gold)',
      }} />
  )
}

function goalSuffix(item: TimelineItem & { kind: 'goal' }): string {
  if (item.isPenalty) return ' (p)'
  if (item.isOwnGoal) return ' (ag)'
  return ''
}

function MatchEvents({ scorers, cards, homeTeamId, awayTeamId }: {
  scorers: GoalEvent[]; cards: CardEvent[]; homeTeamId: string; awayTeamId: string
}) {
  const homeEvents = toTimeline(scorers, cards, homeTeamId)
  const awayEvents = toTimeline(scorers, cards, awayTeamId)
  if (homeEvents.length === 0 && awayEvents.length === 0) return null

  return (
    <div className="mt-2.5 pt-2.5 border-t hairline grid grid-cols-2 gap-x-3 text-[11px]">
      {/* Home — right-aligned */}
      <div className="space-y-0.5">
        {homeEvents.map((e, i) => (
          <div key={i} className="flex items-center justify-end gap-1">
            <span className="text-ink-2 truncate">
              {e.playerName}{e.kind === 'goal' ? goalSuffix(e) : ''}
            </span>
            <span className="text-ink-3 nums shrink-0">{fmtMin(e.minute, e.extra)}</span>
            <EventDot item={e} />
          </div>
        ))}
      </div>
      {/* Away — left-aligned */}
      <div className="space-y-0.5">
        {awayEvents.map((e, i) => (
          <div key={i} className="flex items-center gap-1">
            <EventDot item={e} />
            <span className="text-ink-3 nums shrink-0">{fmtMin(e.minute, e.extra)}</span>
            <span className="text-ink-2 truncate">
              {e.playerName}{e.kind === 'goal' ? goalSuffix(e) : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
