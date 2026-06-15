import { useState } from 'react'
import { TEAMS } from '../../data/teams'
import { computeCrossings, ROUND_LABELS } from '../../lib/knockout'
import type { GroupId, Team } from '../../types'
import type { BracketRound } from '../../data/bracket'
import { Flag } from '../ui/Flag'
import { isArgentina } from '../../data/teams'

const ALL_GROUPS: GroupId[] = ['A','B','C','D','E','F','G','H','I','J','K','L']

const ROUND_COLORS: Record<BracketRound, { text: string; bg: string; border: string }> = {
  r32:   { text: '#6cb8ff', bg: 'color-mix(in srgb, #6cb8ff 12%, transparent)', border: 'color-mix(in srgb, #6cb8ff 32%, transparent)' },
  r16:   { text: '#a78bfa', bg: 'color-mix(in srgb, #a78bfa 12%, transparent)', border: 'color-mix(in srgb, #a78bfa 32%, transparent)' },
  qf:    { text: '#f5c042', bg: 'color-mix(in srgb, #f5c042 12%, transparent)', border: 'color-mix(in srgb, #f5c042 32%, transparent)' },
  sf:    { text: '#fb923c', bg: 'color-mix(in srgb, #fb923c 12%, transparent)', border: 'color-mix(in srgb, #fb923c 32%, transparent)' },
  final: { text: '#16c47f', bg: 'color-mix(in srgb, #16c47f 14%, transparent)', border: 'color-mix(in srgb, #16c47f 34%, transparent)' },
}

const POS_LABELS = ['', '1.° del grupo', '2.° del grupo', '3.° (mejor tercero)']

export function CalculatorView() {
  const [team1Id, setTeam1Id] = useState('')
  const [team2Id, setTeam2Id] = useState('')

  const team1 = TEAMS.find(t => t.id === team1Id)
  const team2 = TEAMS.find(t => t.id === team2Id)

  const crossings = team1 && team2 && team1.group !== team2.group
    ? computeCrossings(team1.group, team2.group) : null
  const sameGroup = team1 && team2 && team1.group === team2.group

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-7">
      <div>
        <h1 className="text-2xl font-bold text-white">Calculadora de Cruces</h1>
        <p className="text-sm text-ink-3 mt-1">
          Elegí dos equipos y mirá en qué instancia podrían enfrentarse, según el cuadro oficial del Mundial 2026.
        </p>
      </div>

      {/* Selectors */}
      <div className="panel p-5 sm:p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <TeamSelector label="Equipo 1" accent="var(--color-grass)" selected={team1Id} onChange={setTeam1Id} excludeId={team2Id} />
          <TeamSelector label="Equipo 2" accent="var(--color-gold)"  selected={team2Id} onChange={setTeam2Id} excludeId={team1Id} />
        </div>

        {team1 && team2 && (
          <div className="flex items-center justify-center gap-4 pt-4 border-t hairline">
            <TeamBubble team={team1} accent="var(--color-grass)" />
            <span className="text-ink-3 text-lg font-display">vs</span>
            <TeamBubble team={team2} accent="var(--color-gold)" />
          </div>
        )}
      </div>

      {sameGroup && (
        <div className="panel p-4 flex items-center gap-3" style={{ borderColor: 'color-mix(in srgb, var(--color-gold) 30%, transparent)' }}>
          <span className="text-xl">⚠️</span>
          <p className="text-xs text-ink-2">
            <span className="font-semibold text-ink">{team1?.name}</span> y <span className="font-semibold text-ink">{team2?.name}</span> están
            en el mismo Grupo {team1?.group}: se enfrentan en la fase de grupos, no en el cuadro de eliminación.
          </p>
        </div>
      )}

      {crossings && team1 && team2 && (
        <ResultsPanel team1={team1} team2={team2} crossings={crossings} />
      )}

      <BracketInfo />
    </div>
  )
}

function TeamSelector({ label, accent, selected, onChange, excludeId }: {
  label: string; accent: string; selected: string; onChange: (id: string) => void; excludeId: string
}) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <select
          value={selected}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-[var(--color-base)] border hairline rounded-xl px-3 py-2.5 text-sm text-ink appearance-none cursor-pointer focus:outline-none"
          style={{ borderColor: selected ? accent : undefined }}
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
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3">▾</span>
      </div>
    </div>
  )
}

function TeamBubble({ team, accent }: { team: Team; accent: string }) {
  const arg = isArgentina(team.id)
  return (
    <div className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border ${arg ? 'arg-glow' : ''}`}
         style={{ borderColor: `color-mix(in srgb, ${accent} 35%, transparent)`, background: `color-mix(in srgb, ${accent} 8%, transparent)` }}>
      <Flag team={team} size={20} />
      <span className={`text-sm font-medium ${arg ? 'arg-text' : 'text-ink'}`}>{team.name}</span>
      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ color: accent, background: `color-mix(in srgb, ${accent} 18%, transparent)` }}>
        G·{team.group}
      </span>
    </div>
  )
}

type CrossScenario = ReturnType<typeof computeCrossings>[0]

function ResultsPanel({ team1, team2, crossings }: { team1: Team; team2: Team; crossings: CrossScenario[] }) {
  const main = crossings.find(c => c.pos1 === 1 && c.pos2 === 1)!
  const col = ROUND_COLORS[main.round]

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-base font-bold text-white">
        <Flag team={team1} size={20} /> {team1.name}
        <span className="text-ink-3 font-normal text-sm">vs</span>
        <Flag team={team2} size={20} /> {team2.name}
      </h2>

      {/* Headline */}
      <div className="rounded-2xl border p-5 text-center" style={{ background: col.bg, borderColor: col.border }}>
        <p className="text-xs text-ink-2">Si ambos ganan su grupo (1.° vs 1.°)</p>
        <p className="text-2xl sm:text-[28px] font-bold mt-1" style={{ color: col.text }}>
          Se cruzan en {ROUND_LABELS[main.round]}
        </p>
        {main.isAmbiguous && <p className="text-[11px] text-[var(--color-gold)] mt-1">* puede variar según los mejores terceros</p>}
      </div>

      {/* All combinations */}
      <div className="panel overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_auto] px-4 py-2.5 border-b hairline text-[11px] text-ink-3 font-semibold uppercase tracking-wide">
          <span>{team1.name}</span>
          <span>{team2.name}</span>
          <span className="text-right">Instancia</span>
        </div>
        {crossings.map((c, i) => {
          const cc = ROUND_COLORS[c.round]
          const hl = c.pos1 === 1 && c.pos2 === 1
          return (
            <div key={i} className={`grid grid-cols-[1fr_1fr_auto] items-center px-4 py-2.5 border-b hairline last:border-0 ${hl ? 'bg-white/[0.025]' : ''}`}>
              <span className="text-[13px] text-ink-2">{POS_LABELS[c.pos1]}</span>
              <span className="text-[13px] text-ink-2">{POS_LABELS[c.pos2]}</span>
              <span className="justify-self-end chip" style={{ color: cc.text, background: cc.bg, border: `1px solid ${cc.border}` }}>
                {ROUND_LABELS[c.round]}{c.isAmbiguous && ' *'}
              </span>
            </div>
          )
        })}
        {crossings.some(c => c.isAmbiguous) && (
          <div className="px-4 py-2 text-[10px] text-[var(--color-gold)]/70 bg-[var(--color-raised)]/40">
            * En escenarios con un 3.°, la instancia exacta depende de qué 8 terceros clasifiquen (Annex C FIFA).
          </div>
        )}
      </div>
    </div>
  )
}

function BracketInfo() {
  const info = [
    { round: 'r32' as BracketRound,   label: 'Dieciseisavos', dates: '28 Jun – 4 Jul', n: '32' },
    { round: 'r16' as BracketRound,   label: 'Octavos',       dates: '4 – 7 Jul',      n: '16' },
    { round: 'qf'  as BracketRound,   label: 'Cuartos',       dates: '9 – 11 Jul',     n: '8'  },
    { round: 'sf'  as BracketRound,   label: 'Semifinal',     dates: '14 – 15 Jul',    n: '4'  },
    { round: 'final' as BracketRound, label: 'Final',         dates: '19 Jul',          n: '2'  },
  ]
  return (
    <div className="panel-raised p-4 space-y-3">
      <h3 className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider">Calendario de eliminatorias</h3>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {info.map(({ round, label, dates, n }) => {
          const col = ROUND_COLORS[round]
          return (
            <div key={round} className="rounded-xl p-3 text-center" style={{ background: col.bg, border: `1px solid ${col.border}` }}>
              <div className="text-lg font-bold font-display" style={{ color: col.text }}>{n}</div>
              <div className="text-[12px] font-semibold text-ink">{label}</div>
              <div className="text-[10px] text-ink-3 mt-0.5">{dates}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
