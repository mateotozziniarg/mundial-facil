import { useState } from 'react'
import { TEAMS } from '../../data/teams'
import { computeCrossings, ROUND_LABELS } from '../../lib/knockout'
import type { GroupId } from '../../types'
import type { BracketRound } from '../../data/bracket'

const ALL_GROUPS: GroupId[] = ['A','B','C','D','E','F','G','H','I','J','K','L']

const ROUND_COLORS: Record<BracketRound, { bg: string; text: string; border: string }> = {
  r32:   { bg: 'rgba(59,130,246,0.1)',  text: '#60a5fa', border: 'rgba(59,130,246,0.3)'  },
  r16:   { bg: 'rgba(139,92,246,0.1)', text: '#a78bfa', border: 'rgba(139,92,246,0.3)' },
  qf:    { bg: 'rgba(245,158,11,0.1)', text: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
  sf:    { bg: 'rgba(249,115,22,0.1)', text: '#fb923c', border: 'rgba(249,115,22,0.3)' },
  final: { bg: 'rgba(236,72,153,0.1)', text: '#f472b6', border: 'rgba(236,72,153,0.3)' },
}

const POS_LABELS = ['', '1° (Campeón grupo)', '2° (Sub-campeón)', '3° (Posible mejor 3°)']

export function CalculatorView() {
  const [team1Id, setTeam1Id] = useState('')
  const [team2Id, setTeam2Id] = useState('')

  const team1 = TEAMS.find(t => t.id === team1Id)
  const team2 = TEAMS.find(t => t.id === team2Id)

  const crossings = team1 && team2 && team1.group !== team2.group
    ? computeCrossings(team1.group, team2.group)
    : null

  const sameGroup = team1 && team2 && team1.group === team2.group

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Calculadora de Cruces 🔮
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Seleccioná dos equipos y descubrí en qué instancia podrían cruzarse, según el bracket oficial FIFA 2026.
        </p>
      </div>

      {/* Selectors */}
      <div className="card p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <TeamSelector
            label="Equipo 1"
            color="#3b82f6"
            selected={team1Id}
            onChange={setTeam1Id}
            excludeId={team2Id}
          />
          <TeamSelector
            label="Equipo 2"
            color="#8b5cf6"
            selected={team2Id}
            onChange={setTeam2Id}
            excludeId={team1Id}
          />
        </div>

        {team1 && team2 && (
          <div className="flex items-center justify-center gap-4 pt-2 border-t border-[#1e2d45]">
            <TeamBubble team={team1} color="#3b82f6" />
            <span className="text-slate-600 text-2xl font-light">vs</span>
            <TeamBubble team={team2} color="#8b5cf6" />
          </div>
        )}
      </div>

      {/* Same group warning */}
      {sameGroup && (
        <div className="card border-yellow-500/30 bg-yellow-500/5 p-4 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-sm text-yellow-300 font-medium">Mismo grupo</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {team1?.name} y {team2?.name} están en el mismo Grupo {team1?.group},
              por lo que se enfrentarán en la fase de grupos (no en el bracket de eliminación directa).
            </p>
          </div>
        </div>
      )}

      {/* Results */}
      {crossings && (
        <ResultsPanel team1={team1!} team2={team2!} crossings={crossings} />
      )}

      {/* Bracket info */}
      <BracketInfo />
    </div>
  )
}

function TeamSelector({
  label, color, selected, onChange, excludeId,
}: {
  label: string; color: string; selected: string; onChange: (id: string) => void; excludeId: string
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
      <select
        value={selected}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-[#0a0e1a] border border-[#1e2d45] rounded-lg px-3 py-2.5 text-sm text-slate-200
                   focus:outline-none focus:border-[color:var(--c)] appearance-none cursor-pointer"
        style={{ '--c': color } as React.CSSProperties}
      >
        <option value="">— Elegir equipo —</option>
        {ALL_GROUPS.map(g => (
          <optgroup key={g} label={`Grupo ${g}`}>
            {TEAMS.filter(t => t.group === g && t.id !== excludeId).map(t => (
              <option key={t.id} value={t.id}>{t.flag} {t.name}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  )
}

function TeamBubble({ team, color }: { team: { name: string; flag: string; group: GroupId }; color: string }) {
  const t = team
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border" style={{ borderColor: color + '40', background: color + '10' }}>
      <span className="text-xl">{t.flag}</span>
      <span className="text-sm font-medium text-slate-200">{t.name}</span>
      <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ color, background: color + '20' }}>G-{t.group}</span>
    </div>
  )
}

type CrossScenario = ReturnType<typeof computeCrossings>[0]

function ResultsPanel({
  team1, team2, crossings,
}: {
  team1: { name: string; flag: string; group: GroupId }
  team2: { name: string; flag: string; group: GroupId }
  crossings: CrossScenario[]
}) {
  // Find the "headliner" — if both 1st: highlight it
  const main = crossings.find(c => c.pos1 === 1 && c.pos2 === 1)

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        {team1.flag} {team1.name} vs {team2.flag} {team2.name}
      </h2>

      {main && (
        <div
          className="rounded-xl border p-4 text-center space-y-1"
          style={{ background: ROUND_COLORS[main.round].bg, borderColor: ROUND_COLORS[main.round].border }}
        >
          <p className="text-xs text-slate-400">Si ambos ganan su grupo</p>
          <p className="text-2xl font-bold" style={{ color: ROUND_COLORS[main.round].text }}>
            Se cruzarían en {ROUND_LABELS[main.round]}
          </p>
          {main.isAmbiguous && (
            <p className="text-xs text-yellow-400/70">* depende de combinación de mejores terceros</p>
          )}
        </div>
      )}

      {/* Grid of all scenarios */}
      <div className="card overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#1e2d45] text-xs text-slate-500 font-medium">
          Todas las combinaciones (posición {team1.name} × posición {team2.name})
        </div>

        <div className="grid grid-cols-3 text-xs">
          {/* Column header */}
          <div className="col-span-3 grid grid-cols-3 px-4 py-2 bg-[#1a2233]">
            <span className="text-slate-500">{team1.flag} {team1.name}</span>
            <span className="text-slate-500 text-center">{team2.flag} {team2.name}</span>
            <span className="text-slate-500 text-right">Instancia</span>
          </div>

          {crossings.map((c, i) => {
            const col = ROUND_COLORS[c.round]
            const highlight = c.pos1 === 1 && c.pos2 === 1
            return (
              <div
                key={i}
                className={`col-span-3 grid grid-cols-3 items-center px-4 py-2.5 border-b border-[#1e2d45]/50 ${highlight ? 'bg-white/3' : ''}`}
              >
                <span className="text-slate-300 font-medium">{POS_LABELS[c.pos1]}</span>
                <span className="text-slate-300 text-center">{POS_LABELS[c.pos2]}</span>
                <div className="flex justify-end">
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ color: col.text, background: col.bg, border: `1px solid ${col.border}` }}
                  >
                    {ROUND_LABELS[c.round]}
                    {c.isAmbiguous && ' *'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {crossings.some(c => c.isAmbiguous) && (
          <div className="px-4 py-2 text-[10px] text-yellow-400/60">
            * La instancia exacta para escenarios con 3° depende de qué 8 terceros clasifiquen (Annex C FIFA).
          </div>
        )}
      </div>
    </div>
  )
}

function BracketInfo() {
  const info = [
    { round: 'r32' as BracketRound,   label: 'Dieciseisavos', dates: '28 Jun – 4 Jul', emoji: '32' },
    { round: 'r16' as BracketRound,   label: 'Octavos',       dates: '4 – 7 Jul',      emoji: '16' },
    { round: 'qf'  as BracketRound,   label: 'Cuartos',       dates: '9 – 11 Jul',     emoji: '8'  },
    { round: 'sf'  as BracketRound,   label: 'Semifinal',     dates: '14 – 15 Jul',    emoji: '4'  },
    { round: 'final' as BracketRound, label: 'Final',         dates: '19 Jul',          emoji: '🏆' },
  ]

  return (
    <div className="card2 p-4 space-y-3">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Calendario Eliminatorias</h3>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {info.map(({ round, label, dates, emoji }) => {
          const col = ROUND_COLORS[round]
          return (
            <div
              key={round}
              className="rounded-lg p-3 text-center space-y-1"
              style={{ background: col.bg, border: `1px solid ${col.border}` }}
            >
              <div className="text-sm font-bold" style={{ color: col.text }}>{emoji}</div>
              <div className="text-xs font-semibold text-slate-200">{label}</div>
              <div className="text-[10px] text-slate-500">{dates}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
