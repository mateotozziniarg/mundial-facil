import type { StandingRow } from '../../types'
import { Flag } from '../ui/Flag'
import { isArgentina } from '../../data/teams'

interface Props {
  group: string
  standings: StandingRow[]
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

export function GroupCard({ group, standings }: Props) {
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
        <div className="grid items-center gap-1 text-[10px] font-semibold text-ink-3"
             style={{ gridTemplateColumns: '18px 1fr repeat(7, 26px) 32px' }}>
          <span />
          <span className="pl-1">Equipo</span>
          {COLS.map(c => <span key={c.key} className="text-center">{c.label}</span>)}
          <span className="text-center text-[var(--color-grass)]">Pts</span>
        </div>
      </div>

      {/* Rows */}
      <div className="px-2 pb-2 space-y-px">
        {standings.map((row, i) => (
          <Row key={row.team.id} row={row} position={i + 1} />
        ))}
      </div>
    </div>
  )
}

function Row({ row, position }: { row: StandingRow; position: number }) {
  const arg = isArgentina(row.team.id)
  const accent =
    position <= 2 ? 'var(--color-grass)' :
    position === 3 ? 'var(--color-gold)' : 'transparent'

  const vals = [row.played, row.won, row.drawn, row.lost, row.goalsFor, row.goalsAgainst]

  return (
    <div
      className={`relative grid items-center gap-1 rounded-lg pl-2.5 pr-2 py-2 transition-colors ${arg ? 'arg-glow' : 'hover:bg-white/[0.025]'}`}
      style={{ gridTemplateColumns: '18px 1fr repeat(7, 26px) 32px' }}
    >
      {/* position accent bar + number */}
      <div className="flex items-center">
        <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full" style={{ background: accent }} />
        <span className={`text-[11px] font-semibold nums ${position <= 2 ? 'text-[var(--color-grass)]' : position === 3 ? 'text-[var(--color-gold)]' : 'text-ink-3'}`}>
          {position}
        </span>
      </div>

      {/* team */}
      <div className="flex items-center gap-2 min-w-0 pl-0.5">
        <Flag team={row.team} size={18} />
        <span className={`text-[13px] truncate ${arg ? 'arg-text font-semibold' : 'text-ink font-medium'}`}>
          {row.team.name}{arg && <span className="ml-1" aria-hidden>★</span>}
        </span>
      </div>

      {/* stats */}
      {vals.map((v, idx) => (
        <span key={idx} className="text-center text-[12px] text-ink-2 nums">{v}</span>
      ))}
      {/* goal diff */}
      <span className={`text-center text-[12px] nums font-medium ${row.goalDiff > 0 ? 'text-[var(--color-grass)]' : row.goalDiff < 0 ? 'text-[#ff7b81]' : 'text-ink-3'}`}>
        {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
      </span>
      {/* points */}
      <span className="text-center text-[14px] font-bold text-white nums">{row.points}</span>
    </div>
  )
}
