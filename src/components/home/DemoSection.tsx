import { useMemo } from 'react'
import { useWorldCupStore } from '../../store/useWorldCupStore'
import { TEAMS, TEAM_MAP, isArgentina } from '../../data/teams'
import { computeProvisionalStandings, compareBestThirds } from '../../lib/standings'
import { Flag } from '../ui/Flag'
import type { GroupId, Match, StandingRow } from '../../types'

const ALL_GROUPS: GroupId[] = ['A','B','C','D','E','F','G','H','I','J','K','L']
const QUALIFY_SPOTS = 8
// Mock scores for the two final-day games: makes the table reshuffled and interesting
const DEMO_SCORES: [number, number][] = [[1, 0], [0, 2]]

function injectMockLive(groupMatches: Match[]): Match[] {
  const sorted = [...groupMatches].sort((a, b) => +new Date(a.date) - +new Date(b.date))
  const lastTwoIds = new Set(sorted.slice(-2).map(m => m.id))
  let i = 0
  return groupMatches.map(m => {
    if (!lastTwoIds.has(m.id)) return m
    const [hs, as_] = DEMO_SCORES[i++ % 2]
    return { ...m, status: 'live' as const, homeScore: hs, awayScore: as_, minute: 67 + i * 5 }
  })
}

function pickDemoGroups(matches: Match[]): GroupId[] {
  return ALL_GROUPS.filter(g => {
    const gm = [...matches.filter(m => m.group === g)]
      .sort((a, b) => +new Date(a.date) - +new Date(b.date))
    return (
      gm.slice(-2).every(m => m.status === 'scheduled') &&
      gm.slice(0, 4).some(m => m.status === 'finished')
    )
  }).slice(0, 2)
}

interface Props { now: number }

export function DemoSection({ now: _now }: Props) {
  // Only reads raw match array — safe, no complex store getter calls
  const matches = useWorldCupStore(s => s.matches)

  const demoGroups = useMemo(() => pickDemoGroups(matches), [matches])

  if (demoGroups.length === 0) {
    return (
      <div className="panel p-5 text-center text-sm text-ink-3">
        No hay grupos con su última fecha pendiente para simular ahora.
        <br />
        <span className="text-[11px]">Volvé a intentarlo cuando estén los fixtures de la siguiente jornada.</span>
      </div>
    )
  }

  return (
    <>
      <p className="-mt-2 text-xs text-ink-3">
        Demo con marcadores de ejemplo · así se vería este panel mientras los dos partidos de un grupo se juegan en simultáneo.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {demoGroups.map(g => (
          <DemoGroupCard key={g} group={g} allMatches={matches} />
        ))}
      </div>
    </>
  )
}

// ─── Single demo group card ──────────────────────────────────────────────────

function DemoGroupCard({ group, allMatches }: { group: GroupId; allMatches: Match[] }) {
  const { standings, liveMatches, thirdRank } = useMemo(() => {
    const groupRaw   = allMatches.filter(m => m.group === group)
    const injected   = injectMockLive(groupRaw)
    const teams      = TEAMS.filter(t => t.group === group)
    const standings  = computeProvisionalStandings(teams, injected)
    const liveMtchs  = injected.filter(m => m.status === 'live')

    // Best thirds across all groups (mock data for this group, real data for others)
    const thirds = ALL_GROUPS.map(g => {
      const gm      = g === group ? injected : allMatches.filter(m => m.group === g)
      const gTeams  = TEAMS.filter(t => t.group === g)
      const gRows   = computeProvisionalStandings(gTeams, gm)
      return gRows[2] ? { ...gRows[2], group: g } : null
    }).filter(Boolean) as (StandingRow & { group: GroupId })[]
    thirds.sort(compareBestThirds)

    const thirdRow  = standings[2]
    const thirdRank = thirdRow ? thirds.findIndex(t => t.team.id === thirdRow.team.id) : -1

    return { standings, liveMatches: liveMtchs, thirdRank }
  }, [group, allMatches])

  const thirdRow = standings[2]
  const thirdIn  = thirdRank >= 0 && thirdRank < QUALIFY_SPOTS

  return (
    <div className="panel overflow-hidden fade-up"
      style={{ borderColor: 'color-mix(in srgb, var(--color-gold) 35%, transparent)', borderStyle: 'dashed' }}>

      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2.5 border-b hairline bg-[var(--color-raised)]/40">
        <span className="grid place-items-center w-7 h-7 rounded-lg text-[13px] font-bold border"
          style={{ background: 'color-mix(in srgb, var(--color-gold) 15%, transparent)', color: 'var(--color-gold)', borderColor: 'color-mix(in srgb, var(--color-gold) 25%, transparent)' }}>
          {group}
        </span>
        <span className="text-sm font-semibold text-ink">Grupo {group}</span>
        <span className="chip ml-auto text-[9px] font-bold"
          style={{ color: 'var(--color-gold)', background: 'color-mix(in srgb, var(--color-gold) 12%, transparent)' }}>
          DEMO
        </span>
      </div>

      {/* Mock live scorelines */}
      <div className="px-3 pt-2.5 space-y-1">
        {liveMatches.map(m => <MockLiveLine key={m.id} match={m} />)}
      </div>

      {/* Provisional standings table */}
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
              entraría como mejor tercero ({thirdRank + 1}.° de {QUALIFY_SPOTS}) → a 16avos
            </span>
          ) : thirdRank >= 0 ? (
            <span style={{ color: '#ff7b81' }}>
              quedaría afuera de los mejores terceros ({thirdRank + 1}.° de 12)
            </span>
          ) : null}
        </div>
      )}

      <p className="px-4 pb-2.5 text-[9.5px] text-ink-3">
        Marcadores ficticios · la tabla real cambia con cada gol
      </p>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MockLiveLine({ match }: { match: Match }) {
  const home = TEAM_MAP.get(match.homeTeamId)
  const away = TEAM_MAP.get(match.awayTeamId)
  if (!home || !away) return null
  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-[var(--color-base)]/60 text-[12px]">
      <Flag team={home} size={14} />
      <span className="flex-1 truncate text-ink-2 text-right">{home.shortName ?? home.name}</span>
      <span className="nums font-bold text-white shrink-0">
        {match.homeScore}<span className="text-ink-3 mx-0.5">-</span>{match.awayScore}
      </span>
      <span className="flex-1 truncate text-ink-2">{away.shortName ?? away.name}</span>
      <Flag team={away} size={14} />
      <span className="ml-1 shrink-0 text-[9px] font-bold nums w-6 text-right"
        style={{ color: 'var(--color-gold)' }}>
        {match.minute}'
      </span>
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
