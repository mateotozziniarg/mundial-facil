import { useState } from 'react'
import type { StandingRow, Match, Team } from '../../types'
import { Flag } from '../ui/Flag'
import { TEAM_MAP, isArgentina } from '../../data/teams'
import { formatArgDate, formatArgTime, effectiveStatus } from '../../lib/dateUtils'

interface Props {
  group: string
  standings: StandingRow[]
  matches: Match[]
}

const COLS = [
  { key: 'played', label: 'PJ' },
  { key: 'won',    label: 'G'  },
  { key: 'drawn',  label: 'E'  },
  { key: 'lost',   label: 'P'  },
  { key: 'goalsFor',     label: 'GF' },
  { key: 'goalsAgainst', label: 'GC' },
  { key: 'goalDiff',     label: 'DG' },
] as const

const GRID = '18px 1fr repeat(7, 26px) 32px'

export function GroupCard({ group, standings, matches }: Props) {
  const [openId, setOpenId] = useState<string | null>(null)
  const anyPlayed = standings.some(r => r.played > 0)

  return (
    <div className="panel overflow-hidden fade-up">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2.5 border-b hairline bg-[var(--color-raised)]/40">
        <span className="grid place-items-center w-7 h-7 rounded-lg bg-[var(--color-grass)]/15 text-[var(--color-grass)] text-[13px] font-bold border border-[var(--color-grass)]/25">
          {group}
        </span>
        <span className="text-sm font-semibold text-ink">Grupo {group}</span>
        {!anyPlayed && <span className="ml-auto text-[10px] text-ink-3">sin jugar</span>}
      </div>

      {/* Column header */}
      <div className="px-3 pt-2.5 pb-1.5">
        <div className="grid items-center gap-1 text-[10px] font-semibold text-ink-3" style={{ gridTemplateColumns: GRID }}>
          <span />
          <span className="pl-1">Equipo</span>
          {COLS.map(c => <span key={c.key} className="text-center">{c.label}</span>)}
          <span className="text-center text-[var(--color-grass)]">Pts</span>
        </div>
      </div>

      {/* Rows */}
      <div className="px-2 pb-2 space-y-px">
        {standings.map((row, i) => (
          <Row
            key={row.team.id}
            row={row}
            position={i + 1}
            matches={matches}
            open={openId === row.team.id}
            onToggle={() => setOpenId(openId === row.team.id ? null : row.team.id)}
          />
        ))}
      </div>
    </div>
  )
}

function Row({ row, position, matches, open, onToggle }: {
  row: StandingRow; position: number; matches: Match[]; open: boolean; onToggle: () => void
}) {
  const arg = isArgentina(row.team.id)
  const accent = position <= 2 ? 'var(--color-grass)' : position === 3 ? 'var(--color-gold)' : 'transparent'
  const vals = [row.played, row.won, row.drawn, row.lost, row.goalsFor, row.goalsAgainst]

  return (
    <div className={`rounded-lg ${open ? 'bg-white/[0.03]' : ''}`}>
      <button
        onClick={onToggle}
        className={`relative w-full grid items-center gap-1 pl-2.5 pr-2 py-2 rounded-lg text-left transition-colors cursor-pointer ${arg ? 'arg-glow' : 'hover:bg-white/[0.04]'}`}
        style={{ gridTemplateColumns: GRID }}
      >
        <div className="flex items-center">
          <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full" style={{ background: accent }} />
          <span className={`text-[11px] font-semibold nums ${position <= 2 ? 'text-[var(--color-grass)]' : position === 3 ? 'text-[var(--color-gold)]' : 'text-ink-3'}`}>{position}</span>
        </div>
        <div className="flex items-center gap-2 min-w-0 pl-0.5">
          <Flag team={row.team} size={18} />
          <span className={`text-[13px] truncate ${arg ? 'arg-text font-semibold' : 'text-ink font-medium'}`}>
            {row.team.name}{arg && <span className="ml-1" aria-hidden>★</span>}
          </span>
          <span className={`text-[9px] text-ink-3 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
        </div>
        {vals.map((v, idx) => <span key={idx} className="text-center text-[12px] text-ink-2 nums">{v}</span>)}
        <span className={`text-center text-[12px] nums font-medium ${row.goalDiff > 0 ? 'text-[var(--color-grass)]' : row.goalDiff < 0 ? 'text-[#ff7b81]' : 'text-ink-3'}`}>
          {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
        </span>
        <span className="text-center text-[14px] font-bold text-white nums">{row.points}</span>
      </button>

      {open && <TeamMatches team={row.team} matches={matches} />}
    </div>
  )
}

function TeamMatches({ team, matches }: { team: Team; matches: Match[] }) {
  const own = matches
    .filter(m => m.homeTeamId === team.id || m.awayTeamId === team.id)
    .sort((a, b) => +new Date(a.date) - +new Date(b.date))

  return (
    <div className="px-2.5 pb-2.5 pt-1 space-y-1 fade-up">
      {own.map(m => <MatchLine key={m.id} match={m} teamId={team.id} />)}
    </div>
  )
}

function MatchLine({ match, teamId }: { match: Match; teamId: string }) {
  const isHome = match.homeTeamId === teamId
  const oppId  = isHome ? match.awayTeamId : match.homeTeamId
  const opp    = TEAM_MAP.get(oppId)
  if (!opp) return null

  const status = effectiveStatus(match.status, match.date)
  const hasScore = match.homeScore !== null && match.awayScore !== null
  const gf = isHome ? match.homeScore : match.awayScore
  const ga = isHome ? match.awayScore : match.homeScore

  let result: 'W' | 'D' | 'L' | null = null
  if (status === 'finished' && hasScore) {
    result = gf! > ga! ? 'W' : gf! === ga! ? 'D' : 'L'
  }
  const resColor = result === 'W' ? 'var(--color-grass)' : result === 'L' ? '#ff7b81' : 'var(--color-ink-3)'

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-[var(--color-base)]/50 text-[12px]">
      {result && (
        <span className="grid place-items-center w-4 h-4 rounded text-[9px] font-bold shrink-0"
          style={{ background: `color-mix(in srgb, ${resColor} 18%, transparent)`, color: resColor }}>
          {result === 'W' ? 'G' : result === 'D' ? 'E' : 'P'}
        </span>
      )}
      <span className="text-ink-3 text-[10px] w-7 shrink-0">{isHome ? 'Loc' : 'Vis'}</span>
      <Flag team={opp} size={14} />
      <span className="flex-1 truncate text-ink-2">{opp.shortName ?? opp.name}</span>
      {hasScore && (status === 'finished' || status === 'live') ? (
        <span className={`nums font-semibold ${status === 'live' ? 'text-[var(--color-live)]' : 'text-white'}`}>
          {match.homeScore}<span className="text-ink-3 mx-0.5">-</span>{match.awayScore}
        </span>
      ) : (
        <span className="text-ink-3 nums text-[11px]">{formatArgDate(match.date)} · {formatArgTime(match.date)}</span>
      )}
    </div>
  )
}
