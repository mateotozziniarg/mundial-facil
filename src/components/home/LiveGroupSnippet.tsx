import type { GroupId, Match, StandingRow } from '../../types'
import { useWorldCupStore } from '../../store/useWorldCupStore'
import { TEAM_MAP, isArgentina } from '../../data/teams'
import { Flag } from '../ui/Flag'
import { elapsedMinutes } from '../../lib/dateUtils'

const QUALIFY_SPOTS = 8   // best thirds that advance to the round of 32

interface Props { group: GroupId; now: number }

/**
 * Live group-definition snippet: while a group's final (simultaneous) matchday
 * is being played, show how the table would end up "with the score right now" —
 * who qualifies directly, who'd grab the 3rd-place spot, and whether that 3rd
 * would currently sneak into the best-thirds bracket.
 */
export function LiveGroupSnippet({ group, now }: Props) {
  const standings   = useWorldCupStore(s => s.getProvisionalStandings(group))
  const liveMatches = useWorldCupStore(s => s.getGroupLiveMatches(group))
  const bestThirds  = useWorldCupStore(s => s.getProvisionalBestThirds())

  const thirdRow = standings[2]
  const thirdRank = thirdRow
    ? bestThirds.findIndex(t => t.team.id === thirdRow.team.id)
    : -1
  const thirdIn = thirdRank >= 0 && thirdRank < QUALIFY_SPOTS

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

      {/* Live scorelines feeding this table */}
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
            <span className="text-[var(--color-grass)]">
              hoy entraría como mejor tercero ({ordinal(thirdRank + 1)} de {QUALIFY_SPOTS}) → a 16avos
            </span>
          ) : thirdRank >= 0 ? (
            <span className="text-[#ff7b81]">
              hoy quedaría afuera de los mejores terceros ({ordinal(thirdRank + 1)} de 12)
            </span>
          ) : (
            <span className="text-ink-3">aún sin posición de tercero comparable</span>
          )}
        </div>
      )}

      <p className="px-4 pb-2.5 text-[9.5px] text-ink-3 leading-snug">
        Tabla provisoria con los goles del minuto a minuto. Cambia con cada gol.
      </p>
    </div>
  )
}

// ─── Live scoreline ──────────────────────────────────────────────────────────

function LiveLine({ match, now }: { match: Match; now: number }) {
  const home = TEAM_MAP.get(match.homeTeamId)
  const away = TEAM_MAP.get(match.awayTeamId)
  if (!home || !away) return null
  const minute = match.minute ?? elapsedMinutes(match.date, now)
  const clock = match.isHalftime ? 'ET' : `${minute}'`

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

// ─── Standing line ───────────────────────────────────────────────────────────

const OUTCOME: Record<1 | 2 | 3 | 4, { color: string; label: string; icon: string }> = {
  1: { color: 'var(--color-grass)', label: 'Clasifica',  icon: '✓' },
  2: { color: 'var(--color-grass)', label: 'Clasifica',  icon: '✓' },
  3: { color: 'var(--color-gold)',  label: '3.°',         icon: '⟳' },
  4: { color: '#ff7b81',            label: 'Afuera',      icon: '✕' },
}

function StandingLine({ row, position }: { row: StandingRow; position: number }) {
  const arg = isArgentina(row.team.id)
  const pos = (position <= 4 ? position : 4) as 1 | 2 | 3 | 4
  const out = OUTCOME[pos]

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
        <span className="text-ink-3">{signed(row.goalDiff)}</span>
        <span className="font-bold text-white w-4 text-right">{row.points}</span>
      </span>

      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 justify-self-end"
        style={{ color: out.color, background: `color-mix(in srgb, ${out.color} 14%, transparent)` }}>
        <span aria-hidden>{out.icon}</span>{out.label}
      </span>
    </div>
  )
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`
}

function ordinal(n: number): string {
  return `${n}.°`
}
