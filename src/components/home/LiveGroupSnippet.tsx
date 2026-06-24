import { useMemo } from 'react'
import { Component, type ReactNode } from 'react'
import { useWorldCupStore } from '../../store/useWorldCupStore'
import { TEAMS, TEAM_MAP, isArgentina } from '../../data/teams'
import { computeProvisionalStandings, compareBestThirds } from '../../lib/standings'
import { Flag } from '../ui/Flag'
import { elapsedMinutes } from '../../lib/dateUtils'
import type { GroupId, Match, StandingRow } from '../../types'

const ALL_GROUPS: GroupId[] = ['A','B','C','D','E','F','G','H','I','J','K','L']
const QUALIFY_SPOTS = 8

// ─── Error boundary ───────────────────────────────────────────────────────────
// Prevents a crash inside one snippet from taking down the whole app.
class SnippetBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (this.state.failed) return null
    return this.props.children
  }
}

// ─── Public export ────────────────────────────────────────────────────────────

interface Props { group: GroupId; now: number }

export function LiveGroupSnippet(props: Props) {
  return (
    <SnippetBoundary>
      <LiveGroupSnippetInner {...props} />
    </SnippetBoundary>
  )
}

// ─── Inner component — reads only raw matches, computes everything locally ────

function LiveGroupSnippetInner({ group, now }: Props) {
  // Only read the raw matches array — no complex getter calls as selectors.
  // Those getters call get() internally which can race with React's render.
  const allMatches = useWorldCupStore(s => s.matches)

  const { standings, liveMatches, thirdRank } = useMemo(() => {
    try {
      const groupMatches = allMatches.filter(m => m.group === group)
      const teams = TEAMS.filter(t => t.group === group)
      const standings = computeProvisionalStandings(teams, groupMatches)

      // Live matches for this group (with scores, not interrupted)
      const liveMatches = groupMatches.filter(
        m => m.status === 'live' && !m.interruption
          && m.homeScore != null && m.awayScore != null
      )

      // Best thirds ranking across all 12 groups
      const thirds = ALL_GROUPS.map(g => {
        const gm = allMatches.filter(m => m.group === g)
        const gt = TEAMS.filter(t => t.group === g)
        const rows = computeProvisionalStandings(gt, gm)
        return rows[2] ? { ...rows[2], group: g } : null
      }).filter((x): x is StandingRow & { group: GroupId } => x !== null)
      thirds.sort(compareBestThirds)

      const thirdRow  = standings[2]
      const thirdRank = thirdRow
        ? thirds.findIndex(t => t.team.id === thirdRow.team.id)
        : -1

      return { standings, liveMatches, thirdRank }
    } catch {
      return { standings: [], liveMatches: [], thirdRank: -1 }
    }
  }, [group, allMatches])

  const thirdRow = standings[2]
  const thirdIn  = thirdRank >= 0 && thirdRank < QUALIFY_SPOTS

  return (
    <div className="panel overflow-hidden fade-up"
      style={{ borderColor: 'color-mix(in srgb, var(--color-live) 35%, transparent)' }}>

      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2.5 border-b hairline bg-[var(--color-raised)]/40">
        <span className="grid place-items-center w-7 h-7 rounded-lg bg-[var(--color-live)]/15 text-[var(--color-live)] text-[13px] font-bold border border-[var(--color-live)]/25">
          {group}
        </span>
        <span className="text-sm font-semibold text-ink">Grupo {group}</span>
        <span className="chip chip-live ml-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-live)] live-dot inline-block" />
          DEFINICIÓN
        </span>
      </div>

      {/* Live scorelines */}
      {liveMatches.length > 0 && (
        <div className="px-3 pt-2.5 space-y-1">
          {liveMatches.map(m => <LiveLine key={m.id} match={m} now={now} />)}
        </div>
      )}

      {/* Provisional table */}
      <div className="px-2 pt-2 pb-1.5 space-y-px">
        {standings.map((row, i) => (
          <StandingLine key={row.team.id} row={row} position={i + 1} />
        ))}
      </div>

      {/* Best-thirds footnote */}
      {thirdRow && (
        <div className="px-4 py-2.5 border-t hairline text-[11px] leading-snug"
          style={{ background: 'var(--color-base)' }}>
          <span className="text-ink-3">3.°: </span>
          <span className="font-semibold text-ink">{thirdRow.team.shortName ?? thirdRow.team.name}</span>{' '}
          {thirdIn ? (
            <span style={{ color: 'var(--color-grass)' }}>
              hoy entraría como mejor tercero ({thirdRank + 1}.° de {QUALIFY_SPOTS}) → a 16avos
            </span>
          ) : thirdRank >= 0 ? (
            <span style={{ color: '#ff7b81' }}>
              hoy quedaría afuera de los mejores terceros ({thirdRank + 1}.° de 12)
            </span>
          ) : null}
        </div>
      )}

      <p className="px-4 pb-2.5 text-[9.5px] text-ink-3 leading-snug">
        Tabla provisoria con los goles del minuto a minuto. Cambia con cada gol.
      </p>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LiveLine({ match, now }: { match: Match; now: number }) {
  const home = TEAM_MAP.get(match.homeTeamId)
  const away = TEAM_MAP.get(match.awayTeamId)
  if (!home || !away) return null
  const minute = match.minute ?? elapsedMinutes(match.date, now)
  const clock  = match.isHalftime ? 'ET' : `${minute}'`

  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-[var(--color-base)]/60 text-[12px]">
      <Flag team={home} size={14} />
      <span className="flex-1 truncate text-ink-2 text-right">{home.shortName ?? home.name}</span>
      <span className="nums font-bold text-white shrink-0">
        {match.homeScore ?? 0}<span className="text-ink-3 mx-0.5">-</span>{match.awayScore ?? 0}
      </span>
      <span className="flex-1 truncate text-ink-2">{away.shortName ?? away.name}</span>
      <Flag team={away} size={14} />
      <span className="ml-1 shrink-0 text-[9px] font-bold text-[var(--color-live)] nums w-6 text-right">{clock}</span>
    </div>
  )
}

const OUTCOME: Record<number, { color: string; label: string; icon: string }> = {
  1: { color: 'var(--color-grass)', label: 'Clasifica', icon: '✓' },
  2: { color: 'var(--color-grass)', label: 'Clasifica', icon: '✓' },
  3: { color: 'var(--color-gold)',  label: '3.°',        icon: '⟳' },
  4: { color: '#ff7b81',            label: 'Afuera',     icon: '✕' },
}

function StandingLine({ row, position }: { row: StandingRow; position: number }) {
  const out = OUTCOME[Math.min(position, 4)]
  const arg = isArgentina(row.team.id)
  const gd  = row.goalDiff

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
        <span aria-hidden>{out.icon}</span>{out.label}
      </span>
    </div>
  )
}
