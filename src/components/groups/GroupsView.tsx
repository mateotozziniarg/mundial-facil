import { useState } from 'react'
import { useWorldCupStore } from '../../store/useWorldCupStore'
import { GroupCard } from './GroupCard'
import type { GroupId, StandingRow } from '../../types'
import { Flag } from '../ui/Flag'
import { isArgentina } from '../../data/teams'

const ALL_GROUPS: GroupId[] = ['A','B','C','D','E','F','G','H','I','J','K','L']

export function GroupsView() {
  const { getAllStandings, getBestThirds, matches } = useWorldCupStore()
  const [tab, setTab] = useState<'groups' | 'thirds'>('groups')
  const allStandings = getAllStandings()
  const thirds = getBestThirds()

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-7">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Fase de Grupos</h1>
          <p className="text-sm text-ink-3 mt-1">Clasifican los 2 primeros de cada grupo + los 8 mejores terceros</p>
        </div>
        <div className="flex gap-1 rounded-xl bg-[var(--color-surface)] p-1 border hairline">
          <TabBtn active={tab === 'groups'} onClick={() => setTab('groups')}>Tablas</TabBtn>
          <TabBtn active={tab === 'thirds'} onClick={() => setTab('thirds')}>Mejores 3°</TabBtn>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-ink-3">
        <Legend color="var(--color-grass)" label="Clasifican directo (1° y 2°)" />
        <Legend color="var(--color-gold)" label="Mejor tercero (en disputa)" />
        <Legend color="var(--color-sky)" label="Argentina" sun />
      </div>

      {tab === 'groups' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {ALL_GROUPS.map(g => (
            <GroupCard key={g} group={g} standings={allStandings[g] ?? []} matches={matches.filter(m => m.group === g)} />
          ))}
        </div>
      ) : (
        <BestThirds thirds={thirds} />
      )}
    </div>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${active ? 'bg-[var(--color-raised)] text-white' : 'text-ink-3 hover:text-ink-2'}`}>
      {children}
    </button>
  )
}

function Legend({ color, label, sun }: { color: string; label: string; sun?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: color }} />
      {label}{sun && <span style={{ color }}>★</span>}
    </span>
  )
}

function BestThirds({ thirds }: { thirds: (StandingRow & { group: GroupId })[] }) {
  const qualify = thirds.slice(0, 8)
  const out = thirds.slice(8)
  return (
    <div className="panel overflow-hidden max-w-3xl">
      <div className="px-5 py-4 border-b hairline">
        <h3 className="text-base font-bold text-white">Carrera de los Mejores Terceros</h3>
        <p className="text-xs text-ink-3 mt-1">
          Los <span className="text-[var(--color-grass)] font-semibold">8 mejores</span> de los 12 terceros clasifican ·
          orden por Pts, DG, GF
        </p>
      </div>

      <div>
        {qualify.map((row, i) => <ThirdRow key={row.team.id} row={row} rank={i + 1} inZone />)}
      </div>

      {out.length > 0 && (
        <div className="relative my-1">
          <div className="absolute inset-x-4 top-1/2 border-t border-dashed border-[var(--color-live)]/25" />
          <div className="relative flex justify-center">
            <span className="px-3 text-[10px] text-[var(--color-live)]/70 bg-[var(--color-surface)] uppercase tracking-wider">
              línea de corte
            </span>
          </div>
        </div>
      )}

      <div className="opacity-55">
        {out.map((row, i) => <ThirdRow key={row.team.id} row={row} rank={i + 9} inZone={false} />)}
      </div>
    </div>
  )
}

function ThirdRow({ row, rank, inZone }: { row: StandingRow & { group: GroupId }; rank: number; inZone: boolean }) {
  const arg = isArgentina(row.team.id)
  return (
    <div className={`flex items-center gap-3 px-5 py-3 border-b hairline last:border-0 ${arg ? 'arg-glow' : ''}`}>
      <span className={`w-6 text-center text-sm font-bold nums ${inZone ? 'text-[var(--color-grass)]' : 'text-ink-3'}`}>{rank}</span>
      <span className="text-[10px] font-bold text-ink-3 w-8">G·{row.group}</span>
      <Flag team={row.team} size={22} />
      <span className={`flex-1 text-sm ${arg ? 'arg-text font-semibold' : 'text-ink font-medium'}`}>
        {row.team.name}{arg && ' ★'}
      </span>
      <div className="flex items-center gap-3 text-[12px] nums text-ink-2">
        <Stat label="Pts" value={row.points} bold />
        <Stat label="DG" value={row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff} />
        <Stat label="GF" value={row.goalsFor} />
      </div>
      <span className={`text-[11px] font-bold w-7 text-right ${inZone ? 'text-[var(--color-grass)]' : 'text-[var(--color-live)]/70'}`}>
        {inZone ? '✓' : '✕'}
      </span>
    </div>
  )
}

function Stat({ label, value, bold }: { label: string; value: number | string; bold?: boolean }) {
  return (
    <span className="flex flex-col items-center w-8">
      <span className={bold ? 'text-white font-bold text-[13px]' : ''}>{value}</span>
      <span className="text-[9px] text-ink-3">{label}</span>
    </span>
  )
}
