import { useState } from 'react'
import { useWorldCupStore } from '../../store/useWorldCupStore'
import { GroupCard } from './GroupCard'
import type { GroupId, StandingRow } from '../../types'

const ALL_GROUPS: GroupId[] = ['A','B','C','D','E','F','G','H','I','J','K','L']

export function GroupsView() {
  const { getAllStandings, getBestThirds } = useWorldCupStore()
  const [tab, setTab] = useState<'groups' | 'thirds'>('groups')
  const allStandings = getAllStandings()
  const thirds = getBestThirds()

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Fase de Grupos
          </h1>
          <p className="text-sm text-slate-500 mt-1">48 equipos · 12 grupos · 3 partidos por equipo</p>
        </div>
        <div className="flex gap-1 rounded-lg bg-[#111827] p-1 border border-[#1e2d45]">
          <TabBtn active={tab === 'groups'} onClick={() => setTab('groups')}>📊 Grupos</TabBtn>
          <TabBtn active={tab === 'thirds'} onClick={() => setTab('thirds')}>🏅 Mejores 3°</TabBtn>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <LegendItem color="#10b981" label="Clasificado directo (1° y 2°)" />
        <LegendItem color="#f59e0b" label="Posible mejor 3°" />
      </div>

      {tab === 'groups' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {ALL_GROUPS.map((g) => (
            <GroupCard
              key={g}
              group={g}
              standings={allStandings[g] ?? []}
            />
          ))}
        </div>
      ) : (
        <BestThirdsPanel thirds={thirds} />
      )}
    </div>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer',
        active ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:text-slate-200',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-3 h-3 rounded-sm" style={{ background: color }} />
      <span>{label}</span>
    </div>
  )
}

function BestThirdsPanel({ thirds }: { thirds: (StandingRow & { group: GroupId })[] }) {
  const qualify = thirds.slice(0, 8)
  const out     = thirds.slice(8)

  return (
    <div className="space-y-6">
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1e2d45]">
          <h3 className="text-sm font-semibold text-white">Carrera de Mejores Terceros</h3>
          <p className="text-xs text-slate-500 mt-0.5">Los 8 mejores terceros clasifican · ordenados por pts, DG, GF</p>
        </div>

        {/* Qualify */}
        <div className="divide-y divide-[#1e2d45]/60">
          {qualify.map((row, i) => (
            <ThirdRow key={row.team.id} row={row} rank={i + 1} qualifies />
          ))}
        </div>

        {/* Separator */}
        {out.length > 0 && (
          <div className="px-4 py-2 border-t border-dashed border-red-500/20 text-[10px] text-red-400/60 text-center">
            — eliminados si el torneo terminara hoy —
          </div>
        )}

        {/* Out */}
        <div className="divide-y divide-[#1e2d45]/40 opacity-50">
          {out.map((row, i) => (
            <ThirdRow key={row.team.id} row={row} rank={i + 9} qualifies={false} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ThirdRow({ row, rank, qualifies }: { row: StandingRow & { group: GroupId }; rank: number; qualifies: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 ${qualifies ? 'hover:bg-white/3' : ''}`}>
      <span className={`text-xs font-bold w-5 text-center ${qualifies ? 'text-green-400' : 'text-slate-600'}`}>
        {rank}
      </span>
      <span className="text-xs font-bold text-slate-500 w-5">G-{row.group}</span>
      <span className="text-xl">{row.team.flag}</span>
      <span className="text-sm text-slate-200 flex-1">{row.team.name}</span>
      <div className="flex gap-3 text-xs tabular-nums text-slate-400">
        <span className="w-6 text-center font-bold text-white">{row.points}</span>
        <span className="w-6 text-center">{row.goalDiff >= 0 ? `+${row.goalDiff}` : row.goalDiff}</span>
        <span className="w-6 text-center">{row.goalsFor}</span>
      </div>
      <span className={`text-xs font-bold ${qualifies ? 'text-green-400' : 'text-red-400'}`}>
        {qualifies ? '✓ CLASIFICA' : '✗'}
      </span>
    </div>
  )
}
