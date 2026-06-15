import type { StandingRow } from '../../types'

interface Props {
  group: string
  standings: StandingRow[]
}

const COLS = ['PJ','G','E','P','GF','GC','DG','Pts']

export function GroupCard({ group, standings }: Props) {
  return (
    <div className="card overflow-hidden fade-up">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1e2d45] flex items-center gap-2">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 text-sm font-bold border border-blue-500/20">
          {group}
        </span>
        <span className="text-sm font-semibold text-slate-300">Grupo {group}</span>
      </div>

      {/* Column headers */}
      <div className="px-4 pt-2 pb-1">
        <div className="grid items-center text-[10px] text-slate-600 font-medium" style={{ gridTemplateColumns: '1fr repeat(8, 28px)' }}>
          <span>Equipo</span>
          {COLS.map(c => <span key={c} className="text-center">{c}</span>)}
        </div>
      </div>

      {/* Rows */}
      <div className="px-2 pb-2 space-y-0.5">
        {standings.map((row, i) => (
          <StandingRowComp key={row.team.id} row={row} position={i + 1} />
        ))}
      </div>
    </div>
  )
}

function StandingRowComp({ row, position }: { row: StandingRow; position: number }) {
  const borderColor =
    position === 1 ? '#10b981' :
    position === 2 ? '#10b981' :
    position === 3 ? '#f59e0b' :
    'transparent'

  const bgColor =
    position <= 2 ? 'rgba(16,185,129,0.04)' :
    position === 3 ? 'rgba(245,158,11,0.04)' :
    'transparent'

  const cells = [
    row.played, row.won, row.drawn, row.lost,
    row.goalsFor, row.goalsAgainst, row.goalDiff, row.points,
  ]

  return (
    <div
      className="grid items-center rounded-md px-2 py-1.5 transition-colors hover:bg-white/3 group"
      style={{
        gridTemplateColumns: '1fr repeat(8, 28px)',
        borderLeft: `2px solid ${borderColor}`,
        background: bgColor,
      }}
    >
      {/* Team */}
      <div className="flex items-center gap-2 min-w-0 pr-2">
        <span className="text-xs text-slate-600 w-4 shrink-0">{position}</span>
        <span className="text-lg shrink-0">{row.team.flag}</span>
        <span className="text-xs text-slate-200 font-medium truncate">{row.team.name}</span>
        {row.qualified === 'direct' && position <= 2 && (
          <span title="Clasificado" className="text-green-400 text-[10px] shrink-0">✓</span>
        )}
        {row.qualified === 'possible-third' && (
          <span title="Posible mejor 3°" className="text-yellow-400 text-[10px] shrink-0">?</span>
        )}
      </div>

      {/* Stats */}
      {cells.map((val, i) => (
        <span
          key={i}
          className={[
            'text-center text-xs tabular-nums',
            i === 7 ? 'font-bold text-white' : 'text-slate-400',
            val !== undefined && Number(val) > 0 && i === 6 ? 'text-green-400' : '',
            val !== undefined && Number(val) < 0 && i === 6 ? 'text-red-400' : '',
          ].join(' ')}
        >
          {val !== undefined ? (Number(val) > 0 && i === 6 ? `+${val}` : val) : ''}
        </span>
      ))}
    </div>
  )
}
