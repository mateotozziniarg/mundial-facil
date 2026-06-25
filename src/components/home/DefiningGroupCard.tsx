import { useMemo, Component, type ReactNode } from 'react'
import { TEAMS, TEAM_MAP, isArgentina } from '../../data/teams'
import { computeProvisionalStandings, compareBestThirds } from '../../lib/standings'
import { Flag } from '../ui/Flag'
import { effectiveStatus, formatArgTime, countdownTo, elapsedMinutes } from '../../lib/dateUtils'
import type { GroupId, Match, StandingRow } from '../../types'

const ALL_GROUPS: GroupId[] = ['A','B','C','D','E','F','G','H','I','J','K','L']
const QUALIFY_SPOTS = 8   // best thirds that advance to the round of 32

type DayState = 'scheduled' | 'live' | 'finished'

// ─── Error boundary ───────────────────────────────────────────────────────────
// A failure inside one card must never take down the whole app.
class CardBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? null : this.props.children }
}

// ─── Public export ────────────────────────────────────────────────────────────

interface Props { group: GroupId; allMatches: Match[]; now: number; demo?: boolean }

export function DefiningGroupCard(props: Props) {
  return (
    <CardBoundary>
      <DefiningGroupCardInner {...props} />
    </CardBoundary>
  )
}

// ─── Inner ────────────────────────────────────────────────────────────────────

function DefiningGroupCardInner({ group, allMatches, now, demo = false }: Props) {
  // Standings + best-thirds rank are time-independent (they read raw m.status),
  // so memoize on [group, allMatches] only — not on the 1s `now` tick.
  const { standings, finalPair, thirdRank } = useMemo(() => {
    try {
      const groupMatches = allMatches
        .filter(m => m.group === group)
        .sort((a, b) => +new Date(a.date) - +new Date(b.date))
      const teams = TEAMS.filter(t => t.group === group)
      const standings = computeProvisionalStandings(teams, groupMatches)
      const finalPair = groupMatches.slice(-2)

      const thirds = ALL_GROUPS.map(g => {
        const gm = allMatches.filter(m => m.group === g)
        const gt = TEAMS.filter(t => t.group === g)
        const rows = computeProvisionalStandings(gt, gm)
        return rows[2] ? { ...rows[2], group: g } : null
      }).filter((x): x is StandingRow & { group: GroupId } => x !== null)
      thirds.sort(compareBestThirds)

      const thirdRow = standings[2]
      const thirdRank = thirdRow ? thirds.findIndex(t => t.team.id === thirdRow.team.id) : -1
      return { standings, finalPair, thirdRank }
    } catch {
      return { standings: [] as StandingRow[], finalPair: [] as Match[], thirdRank: -1 }
    }
  }, [group, allMatches])

  if (standings.length === 0) return null

  // Per-render day state (depends on `now`)
  const statuses = finalPair.map(m => effectiveStatus(m.status, m.date, now))
  const anyLive = statuses.includes('live')
  const allFinished = finalPair.length > 0 && statuses.every(s => s === 'finished')
  const state: DayState = anyLive ? 'live' : allFinished ? 'finished' : 'scheduled'

  const accent = state === 'live' ? 'var(--color-live)'
    : state === 'finished' ? 'var(--color-grass)' : 'var(--color-gold)'

  const thirdRow = standings[2]
  const thirdIn = thirdRank >= 0 && thirdRank < QUALIFY_SPOTS

  return (
    <div className="panel overflow-hidden fade-up"
      style={{ borderColor: `color-mix(in srgb, ${accent} 35%, transparent)` }}>

      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2.5 border-b hairline bg-[var(--color-raised)]/40">
        <span className="grid place-items-center w-7 h-7 rounded-lg text-[13px] font-bold border"
          style={{ background: `color-mix(in srgb, ${accent} 15%, transparent)`, color: accent, borderColor: `color-mix(in srgb, ${accent} 25%, transparent)` }}>
          {group}
        </span>
        <span className="text-sm font-semibold text-ink">Grupo {group}</span>
        {demo && (
          <span className="chip text-[9px] font-bold" style={{ color: 'var(--color-gold)', background: 'color-mix(in srgb, var(--color-gold) 12%, transparent)' }}>
            DEMO
          </span>
        )}
        <StateBadge state={state} className="ml-auto" />
      </div>

      {/* Subtitle */}
      <p className="px-4 pt-2.5 text-[10.5px] text-ink-3 leading-snug">
        {state === 'scheduled' && 'Última fecha hoy en simultáneo · así llegan los equipos'}
        {state === 'live'      && 'Se está definiendo ahora · tabla al minuto a minuto'}
        {state === 'finished'  && 'Grupo definido · clasificación final'}
      </p>

      {/* Final-matchday pair (the two simultaneous games) */}
      {finalPair.length > 0 && (
        <div className="px-3 pt-2 space-y-1">
          {finalPair.map(m => <MatchLine key={m.id} match={m} now={now} />)}
        </div>
      )}

      {/* Standings table */}
      <div className="px-2 pt-2.5 pb-1.5 space-y-px">
        {standings.map((row, i) => (
          <StandingLine key={row.team.id} row={row} position={i + 1} state={state} />
        ))}
      </div>

      {/* Best-thirds footnote */}
      {thirdRow && (
        <div className="px-4 py-2.5 border-t hairline text-[11px] leading-snug" style={{ background: 'var(--color-base)' }}>
          <span className="text-ink-3">3.°: </span>
          <span className="font-semibold text-ink">{thirdRow.team.shortName ?? thirdRow.team.name}</span>{' '}
          {thirdRank < 0 ? (
            <span className="text-ink-3">aún sin comparación de terceros</span>
          ) : thirdIn ? (
            <span style={{ color: 'var(--color-grass)' }}>
              {thirdVerb(state, true)} mejor tercero ({thirdRank + 1}.° de {QUALIFY_SPOTS}) → a 16avos
            </span>
          ) : (
            <span style={{ color: '#ff7b81' }}>
              {thirdVerb(state, false)} los mejores terceros ({thirdRank + 1}.° de 12)
            </span>
          )}
        </div>
      )}

      <p className="px-4 pb-2.5 text-[9.5px] text-ink-3 leading-snug">
        {demo
          ? 'Marcadores ficticios para previsualizar.'
          : state === 'finished'
            ? 'Posiciones finales del grupo.'
            : 'Posiciones provisorias · cambian con cada gol.'}
      </p>
    </div>
  )
}

// ─── State badge ──────────────────────────────────────────────────────────────

function StateBadge({ state, className = '' }: { state: DayState; className?: string }) {
  if (state === 'live') {
    return (
      <span className={`chip chip-live ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-live)] live-dot inline-block" />
        EN VIVO
      </span>
    )
  }
  if (state === 'finished') {
    return (
      <span className={`chip ${className}`} style={{ color: 'var(--color-grass)', background: 'color-mix(in srgb, var(--color-grass) 14%, transparent)' }}>
        FINALIZADO
      </span>
    )
  }
  return (
    <span className={`chip ${className}`} style={{ color: 'var(--color-gold)', background: 'color-mix(in srgb, var(--color-gold) 14%, transparent)' }}>
      HOY
    </span>
  )
}

// ─── Match line (state-aware) ─────────────────────────────────────────────────

function MatchLine({ match, now }: { match: Match; now: number }) {
  const home = TEAM_MAP.get(match.homeTeamId)
  const away = TEAM_MAP.get(match.awayTeamId)
  if (!home || !away) return null

  const st = effectiveStatus(match.status, match.date, now)
  const hasScore = match.homeScore != null && match.awayScore != null
  const minute = match.minute ?? elapsedMinutes(match.date, now)

  // Right-hand clock/tag
  let tag: ReactNode = null
  if (st === 'live') {
    tag = <span className="text-[9px] font-bold text-[var(--color-live)] nums">{match.isHalftime ? 'ET' : `${minute}'`}</span>
  } else if (st === 'finished') {
    tag = <span className="text-[9px] font-bold text-ink-3">Fin</span>
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-[var(--color-base)]/60 text-[12px]">
      <Flag team={home} size={14} />
      <span className="flex-1 truncate text-ink-2 text-right">{home.shortName ?? home.name}</span>
      {st === 'scheduled' || !hasScore ? (
        <span className="nums text-ink-3 shrink-0 text-[11px] px-1">{formatArgTime(match.date)}</span>
      ) : (
        <span className="nums font-bold text-white shrink-0 px-1">
          {match.homeScore}<span className="text-ink-3 mx-0.5">-</span>{match.awayScore}
        </span>
      )}
      <span className="flex-1 truncate text-ink-2">{away.shortName ?? away.name}</span>
      <Flag team={away} size={14} />
      <span className="ml-1 shrink-0 w-7 text-right grid place-items-end">
        {tag ?? <span className="text-[8.5px] text-ink-3 leading-tight">{countdownTo(match.date, now).replace('Faltan ', '').replace('Empieza pronto', 'pronto')}</span>}
      </span>
    </div>
  )
}

// ─── Standing line ────────────────────────────────────────────────────────────

const OUTCOME: Record<number, { color: string; label: string; icon: string }> = {
  1: { color: 'var(--color-grass)', label: 'Clasifica', icon: '✓' },
  2: { color: 'var(--color-grass)', label: 'Clasifica', icon: '✓' },
  3: { color: 'var(--color-gold)',  label: '3.°',        icon: '⟳' },
  4: { color: '#ff7b81',            label: 'Afuera',     icon: '✕' },
}

function StandingLine({ row, position, state }: { row: StandingRow; position: number; state: DayState }) {
  const out = OUTCOME[Math.min(position, 4)]
  const arg = isArgentina(row.team.id)
  const gd = row.goalDiff
  // Soften the wording before/while the matches happen (nothing is final yet)
  const label = state === 'finished' ? out.label
    : out.label === 'Clasifica' ? 'Arriba'
    : out.label

  return (
    <div className={`relative grid items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-lg ${arg ? 'arg-glow' : ''}`}
      style={{ gridTemplateColumns: '14px 1fr auto auto' }}>
      <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full" style={{ background: out.color }} />
      <span className="text-[11px] font-semibold nums" style={{ color: out.color }}>{position}</span>

      <div className="flex items-center gap-2 min-w-0">
        <Flag team={row.team} size={16} />
        <span className={`text-[12.5px] truncate ${arg ? 'arg-text font-semibold' : 'text-ink font-medium'}`}>
          {row.team.shortName ?? row.team.name}{arg && <span className="ml-1" aria-hidden>★</span>}
        </span>
      </div>

      <span className="flex items-center gap-2 text-[11px] nums shrink-0">
        <span className="text-ink-3">{gd > 0 ? `+${gd}` : gd}</span>
        <span className="font-bold text-white w-4 text-right">{row.points}</span>
      </span>

      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 justify-self-end"
        style={{ color: out.color, background: `color-mix(in srgb, ${out.color} 14%, transparent)` }}>
        <span aria-hidden>{out.icon}</span>{label}
      </span>
    </div>
  )
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function thirdVerb(state: DayState, qualifies: boolean): string {
  if (state === 'finished') return qualifies ? 'entró como' : 'quedó afuera de'
  if (state === 'live')      return qualifies ? 'va entrando como' : 'va quedando afuera de'
  return qualifies ? 'así entraría como' : 'así quedaría afuera de'
}
