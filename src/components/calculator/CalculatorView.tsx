import { useState, useRef, useEffect, useMemo } from 'react'
import { TEAMS, isArgentina } from '../../data/teams'
import { computeCrossings, ROUND_LABELS } from '../../lib/knockout'
import type { Team } from '../../types'
import type { BracketRound } from '../../data/bracket'
import { Flag } from '../ui/Flag'

const ROUND_COLORS: Record<BracketRound, { text: string; bg: string; border: string }> = {
  r32:   { text: '#6cb8ff', bg: 'color-mix(in srgb, #6cb8ff 12%, transparent)', border: 'color-mix(in srgb, #6cb8ff 30%, transparent)' },
  r16:   { text: '#a78bfa', bg: 'color-mix(in srgb, #a78bfa 12%, transparent)', border: 'color-mix(in srgb, #a78bfa 30%, transparent)' },
  qf:    { text: '#f5c042', bg: 'color-mix(in srgb, #f5c042 12%, transparent)', border: 'color-mix(in srgb, #f5c042 30%, transparent)' },
  sf:    { text: '#fb923c', bg: 'color-mix(in srgb, #fb923c 12%, transparent)', border: 'color-mix(in srgb, #fb923c 30%, transparent)' },
  final: { text: '#16c47f', bg: 'color-mix(in srgb, #16c47f 14%, transparent)', border: 'color-mix(in srgb, #16c47f 32%, transparent)' },
}

function norm(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function CalculatorView() {
  const [team1Id, setTeam1Id] = useState('')
  const [team2Id, setTeam2Id] = useState('')

  const team1 = TEAMS.find(t => t.id === team1Id)
  const team2 = TEAMS.find(t => t.id === team2Id)

  const crossings = team1 && team2 && team1.group !== team2.group
    ? computeCrossings(team1.group, team2.group) : null
  const sameGroup = team1 && team2 && team1.group === team2.group

  function swap() {
    const t = team1Id
    setTeam1Id(team2Id)
    setTeam2Id(t)
  }

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
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-end gap-3">
          <TeamCombobox
            label="Equipo 1"
            accent="var(--color-grass)"
            selected={team1Id}
            onChange={setTeam1Id}
            excludeId={team2Id}
          />
          <button
            onClick={swap}
            title="Intercambiar"
            className="h-10 w-10 shrink-0 rounded-full border hairline hover:border-[var(--color-line-2)] hover:bg-white/5 grid place-items-center text-ink-3 hover:text-ink transition-colors self-end mb-0.5"
          >
            ⇄
          </button>
          <TeamCombobox
            label="Equipo 2"
            accent="var(--color-gold)"
            selected={team2Id}
            onChange={setTeam2Id}
            excludeId={team1Id}
          />
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

      {!team1 && !team2 && <EmptyHint />}

      {crossings && team1 && team2 && (
        <ResultsPanel team1={team1} team2={team2} crossings={crossings} />
      )}

      <BracketInfo />
    </div>
  )
}

// ─── Combobox ────────────────────────────────────────────────────────────────

function TeamCombobox({ label, accent, selected, onChange, excludeId }: {
  label: string; accent: string; selected: string; onChange: (id: string) => void; excludeId: string
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const selectedTeam = TEAMS.find(t => t.id === selected)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const flatFiltered = useMemo(() => {
    const q = norm(query.trim())
    const pool = TEAMS.filter(t => t.id !== excludeId)

    if (!q) {
      // No query → full list, alphabetical by Spanish name
      return [...pool].sort((a, b) => a.name.localeCompare(b.name, 'es'))
    }

    // Score each match so prefix hits rank above mid-string hits
    const scored = pool
      .map(t => {
        const name = norm(t.name)
        const short = t.shortName ? norm(t.shortName) : ''
        const id = t.id.toLowerCase()
        let score = -1
        if (name.startsWith(q)) score = 0
        else if (short && short.startsWith(q)) score = 1
        else if (id === q) score = 1
        else if (name.split(/\s+/).some(w => w.startsWith(q))) score = 2
        else if (name.includes(q)) score = 3
        else if (short.includes(q) || id.includes(q)) score = 4
        return { t, score }
      })
      .filter(x => x.score >= 0)

    scored.sort((a, b) => a.score - b.score || a.t.name.localeCompare(b.t.name, 'es'))
    return scored.map(x => x.t)
  }, [query, excludeId])

  useEffect(() => setActiveIdx(-1), [query])

  // Scroll active item into view
  useEffect(() => {
    if (activeIdx < 0 || !listRef.current) return
    const el = listRef.current.querySelector(`[data-idx="${activeIdx}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  function select(id: string) {
    onChange(id)
    setQuery('')
    setOpen(false)
    setActiveIdx(-1)
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('')
    setQuery('')
    inputRef.current?.focus()
    setOpen(true)
  }

  function openDropdown() {
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { setOpen(true); return }
      return
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIdx(i => Math.min(i + 1, flatFiltered.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIdx(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (activeIdx >= 0 && flatFiltered[activeIdx]) select(flatFiltered[activeIdx].id)
        else if (flatFiltered.length === 1) select(flatFiltered[0].id)
        break
      case 'Escape':
        setOpen(false)
        setQuery('')
        break
      case 'Tab':
        setOpen(false)
        setQuery('')
        break
    }
  }

  const isOpen = open

  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider">{label}</label>
      <div ref={containerRef} className="relative">
        {/* Trigger */}
        <div
          className="flex items-center gap-2 w-full bg-[var(--color-base)] border rounded-xl px-3 h-11 cursor-text transition-colors"
          style={{
            borderColor: isOpen
              ? accent
              : selected
                ? `color-mix(in srgb, ${accent} 50%, transparent)`
                : 'var(--color-line)',
            boxShadow: isOpen ? `0 0 0 3px color-mix(in srgb, ${accent} 12%, transparent)` : undefined,
          }}
          onClick={openDropdown}
        >
          {selectedTeam && !isOpen && (
            <Flag team={selectedTeam} size={18} className="shrink-0" />
          )}
          {isOpen && (
            <span className="text-ink-3 shrink-0 text-sm">🔍</span>
          )}
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-3 outline-none min-w-0 cursor-text"
            placeholder={selectedTeam ? selectedTeam.name : 'Buscar equipo…'}
            value={isOpen ? query : ''}
            onChange={e => { setQuery(e.target.value); setActiveIdx(-1) }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
          />
          {selected ? (
            <button
              onClick={clear}
              className="shrink-0 w-5 h-5 rounded-full grid place-items-center text-ink-3 hover:text-ink hover:bg-white/10 transition-colors text-sm leading-none"
              title="Borrar"
            >
              ×
            </button>
          ) : (
            <span className="text-ink-3 text-[10px] shrink-0 pointer-events-none">{isOpen ? '▴' : '▾'}</span>
          )}
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div
            ref={listRef}
            className="absolute z-50 top-full left-0 right-0 mt-1.5 border hairline rounded-xl shadow-2xl overflow-hidden"
            style={{ background: 'var(--color-raised)', maxHeight: 288, overflowY: 'auto' }}
          >
            {flatFiltered.length === 0 ? (
              <div className="px-4 py-4 text-sm text-ink-3 text-center">Sin resultados para "{query}"</div>
            ) : flatFiltered.map((t, idx) => {
              const isActive = idx === activeIdx
              const isSel = t.id === selected
              return (
                <button
                  key={t.id}
                  data-idx={idx}
                  onMouseDown={e => { e.preventDefault(); select(t.id) }}
                  onMouseEnter={() => setActiveIdx(idx)}
                  className={[
                    'w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-sm transition-colors',
                    isActive ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]',
                    isSel ? 'text-[var(--color-grass)]' : 'text-ink',
                  ].join(' ')}
                >
                  <Flag team={t} size={16} />
                  <span className="flex-1 truncate">{t.name}</span>
                  <span className="text-[9px] font-bold text-ink-3 px-1.5 py-0.5 rounded bg-white/[0.05] shrink-0">
                    {t.group}
                  </span>
                  {isSel && <span className="text-[var(--color-grass)] text-xs shrink-0">✓</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Team bubble (shown after both selected) ──────────────────────────────

function TeamBubble({ team, accent }: { team: Team; accent: string }) {
  const arg = isArgentina(team.id)
  return (
    <div className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border ${arg ? 'arg-glow' : ''}`}
      style={{ borderColor: `color-mix(in srgb, ${accent} 35%, transparent)`, background: `color-mix(in srgb, ${accent} 8%, transparent)` }}>
      <Flag team={team} size={20} />
      <span className={`text-sm font-medium ${arg ? 'arg-text' : 'text-ink'}`}>{team.name}</span>
      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
        style={{ color: accent, background: `color-mix(in srgb, ${accent} 18%, transparent)` }}>
        G·{team.group}
      </span>
    </div>
  )
}

// ─── Empty state hint ─────────────────────────────────────────────────────

function EmptyHint() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center text-ink-3 space-y-2">
      <span className="text-4xl opacity-50">🔀</span>
      <p className="text-sm">Elegí dos equipos para ver en qué fase se podrían cruzar.</p>
      <p className="text-[11px]">Podés buscar por nombre o navegar por grupo.</p>
    </div>
  )
}

// ─── Results ─────────────────────────────────────────────────────────────

type CrossScenario = ReturnType<typeof computeCrossings>[0]

const POS_CHIP: Record<1|2|3, { label: string; color: string }> = {
  1: { label: '1.° del grupo',       color: '#f5c042' },
  2: { label: '2.° del grupo',       color: '#94a3b8' },
  3: { label: '3.° (mejor tercero)', color: '#fb923c' },
}

function PosChip({ pos }: { pos: 1|2|3 }) {
  const { label, color } = POS_CHIP[pos]
  return (
    <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full"
      style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}>
      {label}
    </span>
  )
}

function ResultsPanel({ team1, team2, crossings }: { team1: Team; team2: Team; crossings: CrossScenario[] }) {
  const main = crossings.find(c => c.pos1 === 1 && c.pos2 === 1)!
  const col = ROUND_COLORS[main.round]

  // Split into groups for easier reading
  const topScenarios  = crossings.filter(c => c.pos1 === 1 && c.pos2 === 1)
  const mixScenarios  = crossings.filter(c => (c.pos1 === 1 && c.pos2 === 2) || (c.pos1 === 2 && c.pos2 === 1) || (c.pos1 === 2 && c.pos2 === 2))
  const thirdScenarios = crossings.filter(c => c.pos1 === 3 || c.pos2 === 3)
  const hasAmbiguous = crossings.some(c => c.isAmbiguous)

  return (
    <div className="space-y-4">
      <h2 className="flex flex-wrap items-center gap-2 text-base font-bold text-white">
        <Flag team={team1} size={20} />
        <span>{team1.name}</span>
        <span className="text-ink-3 font-normal text-sm">vs</span>
        <Flag team={team2} size={20} />
        <span>{team2.name}</span>
      </h2>

      {/* Headline card — 1st vs 1st */}
      <div className="rounded-2xl border p-5 text-center" style={{ background: col.bg, borderColor: col.border }}>
        <p className="text-[11px] text-ink-3 uppercase tracking-wider mb-1">Si ambos ganan su grupo</p>
        <p className="text-2xl sm:text-3xl font-bold" style={{ color: col.text }}>
          {ROUND_LABELS[main.round]}
        </p>
        {main.isAmbiguous && (
          <p className="text-[11px] text-[var(--color-gold)] mt-1.5">
            * puede variar según qué terceros clasifiquen
          </p>
        )}
      </div>

      {/* Scenarios table */}
      <div className="panel overflow-hidden">
        <div className="px-4 py-2.5 border-b hairline text-[11px] text-ink-3 font-semibold uppercase tracking-wide">
          Todos los escenarios
        </div>

        {/* 1st vs 1st */}
        <ScenarioRow crossings={topScenarios} highlight />

        {/* Other qualifier combos */}
        {mixScenarios.length > 0 && (
          <>
            <div className="px-4 py-1 text-[10px] text-ink-3 bg-[var(--color-base)]/40 border-t hairline">
              Otros clasificados
            </div>
            <ScenarioRow crossings={mixScenarios} />
          </>
        )}

        {/* Third place scenarios */}
        {thirdScenarios.length > 0 && (
          <>
            <div className="px-4 py-1 text-[10px] text-ink-3 bg-[var(--color-base)]/40 border-t hairline">
              Con algún mejor tercero
            </div>
            <ScenarioRow crossings={thirdScenarios} />
          </>
        )}

        {hasAmbiguous && (
          <div className="px-4 py-2 text-[10px] text-[var(--color-gold)]/70 bg-[var(--color-raised)]/40 border-t hairline">
            * La instancia exacta depende de qué 8 terceros clasifiquen (Anexo C FIFA 2026).
          </div>
        )}
      </div>
    </div>
  )
}

function ScenarioRow({ crossings, highlight }: {
  crossings: CrossScenario[]; team1?: Team; team2?: Team; highlight?: boolean
}) {
  return (
    <>
      {crossings.map((c, i) => {
        const cc = ROUND_COLORS[c.round]
        return (
          <div key={i}
            className={[
              'grid grid-cols-[1fr_1fr_auto] items-center px-4 py-2.5 border-t hairline first:border-0 gap-2',
              highlight ? 'bg-white/[0.025]' : '',
            ].join(' ')}>
            <PosChip pos={c.pos1} />
            <PosChip pos={c.pos2} />
            <span className="justify-self-end text-[11px] font-semibold px-2.5 py-1 rounded-full border"
              style={{ color: cc.text, background: cc.bg, borderColor: cc.border }}>
              {ROUND_LABELS[c.round]}{c.isAmbiguous ? ' *' : ''}
            </span>
          </div>
        )
      })}
    </>
  )
}

// ─── Bracket info ─────────────────────────────────────────────────────────

function BracketInfo() {
  const rounds: { round: BracketRound; label: string; dates: string; n: string; desc: string }[] = [
    { round: 'r32',   label: 'Dieciseisavos', dates: '28 Jun – 4 Jul',  n: '32', desc: '32 partidos' },
    { round: 'r16',   label: 'Octavos',       dates: '4 – 7 Jul',       n: '16', desc: '16 partidos' },
    { round: 'qf',    label: 'Cuartos',       dates: '9 – 11 Jul',      n: '8',  desc: '8 partidos'  },
    { round: 'sf',    label: 'Semifinal',     dates: '14 – 15 Jul',     n: '4',  desc: '2 partidos'  },
    { round: 'final', label: 'Final',         dates: '19 Jul · Nueva York', n: '2', desc: '1 partido' },
  ]
  return (
    <div className="panel-raised p-4 space-y-3">
      <h3 className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider">
        Calendario eliminatorias
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {rounds.map(({ round, label, dates, n, desc }) => {
          const col = ROUND_COLORS[round]
          return (
            <div key={round} className="rounded-xl p-3 text-center space-y-0.5"
              style={{ background: col.bg, border: `1px solid ${col.border}` }}>
              <div className="text-xl font-bold font-display" style={{ color: col.text }}>{n}</div>
              <div className="text-[12px] font-semibold text-ink">{label}</div>
              <div className="text-[9.5px] text-ink-3">{dates}</div>
              <div className="text-[9px] text-ink-3 opacity-70">{desc}</div>
            </div>
          )
        })}
      </div>
      <p className="text-[10px] text-ink-3 text-center">
        Grupos terminan el 26 Jun · El cuadro lo define FIFA según el Anexo C para los terceros
      </p>
    </div>
  )
}
