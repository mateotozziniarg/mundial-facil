import { useEffect, useRef, useState } from 'react'
import { useWorldCupStore } from '../../store/useWorldCupStore'
import { resolveBracket, gamesByRound, type BracketGame, type BracketSlot } from '../../lib/bracketResolve'
import { ROUND_LABELS, type BracketRound } from '../../data/bracket'
import { Flag } from '../ui/Flag'
import { isArgentina } from '../../data/teams'
import { formatArgDate, effectiveStatus, timeAgo } from '../../lib/dateUtils'
import { IconRefresh, IconTrophy } from '../ui/icons'

// Mirrored bracket geometry: every column shares the same flex row, so with
// equal header heights the flex-1 cells of adjacent rounds line up exactly
// (a round's cell center falls at 25% / 75% of the next round's cell).
const SIDE_W = 200
const CONN_W = 24
const STEM_W = 20
const CENTER_W = 264
const HEADER_H = 56

const POLL_LIVE = 45_000    // live matches → hit the API every 45s
const POLL_IDLE = 180_000   // nothing live → still re-check every 3 min

const SHORT: Record<BracketRound, string> = {
  r32: '16avos', r16: 'Octavos', qf: 'Cuartos', sf: 'Semifinal', final: 'Final',
}

const LINE = '1.5px solid var(--color-line-2)'

export function BracketsView() {
  const { getAllStandings, getBestThirds, hasLiveMatches } = useWorldCupStore()
  const matches = useWorldCupStore(s => s.matches)
  const refresh = useWorldCupStore(s => s.refresh)
  const isRefreshing = useWorldCupStore(s => s.isRefreshing)
  const lastRefresh = useWorldCupStore(s => s.lastRefresh)

  const standings = getAllStandings()
  const thirdGroups = getBestThirds().map(t => t.group)
  const games = resolveBracket(standings, thirdGroups, matches)
  const byRound = gamesByRound(games)
  const live = hasLiveMatches()

  // ── Data freshness: refresh on mount, then poll while the view is open ──
  useEffect(() => { refresh(true) }, [refresh])
  useEffect(() => {
    const t = setInterval(() => refresh(false), live ? POLL_LIVE : POLL_IDLE)
    return () => clearInterval(t)
  }, [live, refresh])

  // 5s tick keeps "actualizado hace…" and live statuses fresh on screen
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 5000)
    return () => clearInterval(t)
  }, [])

  // ── Split each round into the two halves of the draw ──
  const sorted = (r: BracketRound) => [...byRound[r]].sort((a, b) => a.matchNum - b.matchNum)
  const r32 = sorted('r32'), r16 = sorted('r16'), qf = sorted('qf'), sf = sorted('sf')
  const finalGame = byRound.final.find(g => g.matchNum === 104)
  const thirdGame = byRound.final.find(g => g.matchNum === 103)
  const left  = { r32: r32.slice(0, 8), r16: r16.slice(0, 4), qf: qf.slice(0, 2), sf: sf.slice(0, 1) }
  const right = { r32: r32.slice(8),    r16: r16.slice(4),    qf: qf.slice(2),    sf: sf.slice(1) }

  // ── Start with the final centered on screen ──
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2
  }, [])
  const scrollTo = (pos: 'left' | 'center' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const target = pos === 'left' ? 0 : pos === 'right' ? el.scrollWidth : (el.scrollWidth - el.clientWidth) / 2
    el.scrollTo({ left: target, behavior: 'smooth' })
  }

  const anyResult = games.some(g => g.top.score != null || g.bottom.score != null)

  return (
    <div className="max-w-[1500px] mx-auto px-4 py-8 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Llaves</h1>
          <p className="text-sm text-ink-3 mt-1">
            {anyResult
              ? <>La final en el centro y cada lado del cuadro a los costados. Se completa solo con los <span className="text-[var(--color-grass)] font-medium">resultados reales</span> de cada partido.</>
              : <>Cómo quedaría el cuadro <span className="text-[var(--color-grass)] font-medium">si la fase de grupos terminara hoy</span>. Se va a ir completando con cada partido jugado.</>}
          </p>
        </div>
        {/* Live data status + manual refresh */}
        <div className="flex items-center gap-3">
          {live && (
            <span className="chip chip-live">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-live)] live-dot inline-block" />
              EN VIVO
            </span>
          )}
          <button
            onClick={() => refresh(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 text-[11px] text-ink-3 hover:text-ink-2 transition-colors cursor-pointer disabled:opacity-50"
            title="Actualizar resultados desde la API"
          >
            <IconRefresh size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span className="tabular-nums">
              {isRefreshing ? 'Actualizando…' : lastRefresh ? `Actualizado ${timeAgo(lastRefresh)}` : 'Actualizar'}
            </span>
          </button>
        </div>
      </div>

      {/* Legend + quick navigation */}
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 text-[11px] text-ink-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Tag color="var(--color-grass)" label="1° de grupo" />
          <Tag color="var(--color-ink-2)" label="2° de grupo" />
          <Tag color="var(--color-gold)" label="Mejor 3°" />
        </div>
        <div className="flex items-center gap-1.5">
          <JumpBtn onClick={() => scrollTo('left')}>← Lado A</JumpBtn>
          <JumpBtn onClick={() => scrollTo('center')} accent>
            <IconTrophy size={12} /> Final
          </JumpBtn>
          <JumpBtn onClick={() => scrollTo('right')}>Lado B →</JumpBtn>
        </div>
      </div>

      {/* Mirrored bracket */}
      <div ref={scrollRef} className="scroll-x overflow-x-auto pb-4">
        <div className="flex min-w-max items-stretch mx-auto">
          <RoundColumn round="r32" games={left.r32} />
          <ConnectorCol count={4} side="L" />
          <RoundColumn round="r16" games={left.r16} />
          <ConnectorCol count={2} side="L" />
          <RoundColumn round="qf" games={left.qf} />
          <ConnectorCol count={1} side="L" />
          <RoundColumn round="sf" games={left.sf} />
          <Stem />
          {finalGame && thirdGame && <CenterColumn final={finalGame} third={thirdGame} />}
          <Stem />
          <RoundColumn round="sf" games={right.sf} />
          <ConnectorCol count={1} side="R" />
          <RoundColumn round="qf" games={right.qf} />
          <ConnectorCol count={2} side="R" />
          <RoundColumn round="r16" games={right.r16} />
          <ConnectorCol count={4} side="R" />
          <RoundColumn round="r32" games={right.r32} />
        </div>
      </div>

      <p className="text-[11px] text-ink-3">
        * Resultados en vivo vía ESPN, actualizados automáticamente cada {live ? '45 segundos' : '3 minutos'} mientras estás en esta vista. El partido por el 3.er puesto se juega el 18/7 y la final el 19/7.
      </p>
    </div>
  )
}

/* ───────────────────────── Columns & connectors ───────────────────────── */

function RoundColumn({ round, games }: { round: BracketRound; games: BracketGame[] }) {
  return (
    <div className="flex flex-col shrink-0" style={{ width: SIDE_W }}>
      <RoundHeader round={round} />
      <div className="flex-1 flex flex-col">
        {games.map((g, i) => (
          <div key={g.matchNum} className="flex-1 flex flex-col justify-center py-1">
            <MatchBox g={g} style={{ animationDelay: `${i * 25}ms` }} />
          </div>
        ))}
      </div>
    </div>
  )
}

function RoundHeader({ round }: { round: BracketRound }) {
  return (
    <div
      className="shrink-0 bg-[var(--color-raised)]/70 backdrop-blur-sm rounded-lg px-2 border hairline text-center mb-2 grid place-items-center"
      style={{ height: HEADER_H - 8 }}
    >
      <div>
        <div className="text-[13px] font-bold text-white leading-tight">{SHORT[round]}</div>
        <div className="text-[10px] text-ink-3 leading-tight">{ROUND_LABELS[round]}</div>
      </div>
    </div>
  )
}

/** Bracket lines joining each pair of feeders to the next round's match. */
function ConnectorCol({ count, side }: { count: number; side: 'L' | 'R' }) {
  return (
    <div className="flex flex-col shrink-0" style={{ width: CONN_W }}>
      <div className="shrink-0" style={{ height: HEADER_H }} />
      <div className="flex-1 flex flex-col">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="flex-1 relative">
            <div
              className="absolute inset-x-0"
              style={{
                top: '25%', height: '50%',
                borderTop: LINE, borderBottom: LINE,
                ...(side === 'L'
                  ? { borderRight: LINE, borderRadius: '0 8px 8px 0' }
                  : { borderLeft: LINE, borderRadius: '8px 0 0 8px' }),
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Straight line from each semifinal into the final. */
function Stem() {
  return (
    <div className="flex flex-col shrink-0" style={{ width: STEM_W }}>
      <div className="shrink-0" style={{ height: HEADER_H }} />
      <div className="flex-1 relative">
        <div className="absolute inset-x-0" style={{ top: '50%', borderTop: LINE }} />
      </div>
    </div>
  )
}

/* ───────────────────────── Center: the final ───────────────────────── */

function CenterColumn({ final, third }: { final: BracketGame; third: BracketGame }) {
  const champion = final.top.isWinner ? final.top.team : final.bottom.isWinner ? final.bottom.team : null
  return (
    <div className="flex flex-col shrink-0" style={{ width: CENTER_W }}>
      <div
        className="shrink-0 rounded-lg px-2 text-center mb-2 grid place-items-center border"
        style={{
          height: HEADER_H - 8,
          borderColor: 'color-mix(in srgb, var(--color-gold) 35%, transparent)',
          background: 'color-mix(in srgb, var(--color-gold) 8%, transparent)',
        }}
      >
        <div className="text-[13px] font-bold text-[var(--color-gold)] inline-flex items-center gap-1.5">
          <IconTrophy size={15} /> Gran Final
        </div>
      </div>

      {/* 1fr / auto / 1fr keeps the final box at the exact vertical center,
          aligned with both semifinal stems. */}
      <div className="flex-1 grid px-1" style={{ gridTemplateRows: '1fr auto 1fr' }}>
        <div className="flex flex-col justify-end items-center pb-4 text-center">
          {champion ? (
            <div className="fade-up flex flex-col items-center gap-2">
              <IconTrophy size={30} className="text-[var(--color-gold)]" />
              <Flag team={champion} size={38} />
              <div>
                <div className="text-[15px] font-bold text-white leading-tight">
                  {champion.shortName ?? champion.name}
                </div>
                <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-[var(--color-gold)] mt-0.5">
                  Campeón del Mundo
                </div>
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-ink-3 leading-relaxed">
              <span className="text-ink-2 font-medium">19 de julio</span> · MetLife Stadium
              <br />Nueva Jersey, EE.UU.
            </div>
          )}
        </div>

        <MatchBox g={final} variant="final" />

        <div className="flex flex-col justify-start pt-5">
          <div className="text-[10px] uppercase tracking-wider text-ink-3 mb-1.5 text-center">
            3.er puesto · sáb 18/7
          </div>
          <MatchBox g={third} variant="third" />
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────── Match boxes ───────────────────────── */

function MatchBox({ g, variant = 'side', style }: {
  g: BracketGame
  variant?: 'side' | 'final' | 'third'
  style?: React.CSSProperties
}) {
  const hasArg = (g.top.team && isArgentina(g.top.team.id)) || (g.bottom.team && isArgentina(g.bottom.team.id))
  const status = effectiveStatus(g.status, g.date)
  const liveNow = status === 'live'
  const isFinal = variant === 'final'
  const borderColor = liveNow
    ? 'color-mix(in srgb, var(--color-live) 45%, transparent)'
    : isFinal ? 'color-mix(in srgb, var(--color-gold) 40%, transparent)' : undefined
  return (
    <div
      style={{
        ...style,
        borderColor,
        boxShadow: isFinal && !hasArg
          ? '0 0 26px -6px color-mix(in srgb, var(--color-gold) 45%, transparent)'
          : undefined,
      }}
      className={`panel fade-up overflow-hidden ${hasArg ? 'arg-glow' : ''} ${variant === 'third' ? 'opacity-80' : ''}`}
    >
      <div className="flex items-center justify-between px-2.5 pt-1.5">
        <span className="text-[9px] font-semibold text-ink-3">#{g.matchNum}</span>
        {liveNow
          ? <span className="text-[8.5px] font-bold text-[var(--color-live)] inline-flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-[var(--color-live)] live-dot inline-block" />EN VIVO</span>
          : <span className="text-[9px] text-ink-3">{formatArgDate(g.date)}</span>}
      </div>
      <div className="px-1.5 pb-1.5 pt-1 space-y-px">
        <SlotRow slot={g.top} status={status} big={isFinal} />
        <SlotRow slot={g.bottom} status={status} big={isFinal} />
      </div>
    </div>
  )
}

function SlotRow({ slot, status, big }: { slot: BracketSlot; status: 'scheduled' | 'live' | 'finished'; big?: boolean }) {
  const arg = slot.team && isArgentina(slot.team.id)
  const posColor =
    slot.position === 1 ? 'var(--color-grass)' :
    slot.position === 2 ? 'var(--color-ink-2)' :
    slot.position === 3 ? 'var(--color-gold)' : 'transparent'
  const showScore = (status === 'finished' || status === 'live') && slot.score != null
  const dim = status === 'finished' && !slot.isWinner

  if (slot.team) {
    return (
      <div className={`flex items-center gap-2 rounded-md px-2 ${big ? 'py-2' : 'py-1.5'} ${slot.isWinner ? 'bg-[var(--color-grass)]/10' : 'hover:bg-white/[0.03]'} ${dim ? 'opacity-55' : ''}`}>
        <Flag team={slot.team} size={big ? 19 : 16} />
        <span className={`flex-1 ${big ? 'text-[13.5px]' : 'text-[12.5px]'} truncate ${arg ? 'arg-text font-semibold' : slot.isWinner ? 'text-white font-semibold' : 'text-ink font-medium'}`}>
          {slot.team.shortName ?? slot.team.name}{arg && ' ★'}
        </span>
        {slot.isWinner && <span className="text-[var(--color-grass)] text-[10px] shrink-0">✓</span>}
        {showScore ? (
          <span className={`${big ? 'text-[14.5px]' : 'text-[13px]'} font-bold nums shrink-0 ${slot.isWinner ? 'text-white' : 'text-ink-2'}`}>
            {slot.score}{slot.pens != null && <span className="text-[9px] text-ink-3 ml-0.5">({slot.pens})</span>}
          </span>
        ) : slot.position ? (
          <span className="text-[9px] font-bold px-1 rounded shrink-0" style={{ color: posColor }}>
            {slot.position}°
          </span>
        ) : null}
      </div>
    )
  }
  return (
    <div className={`flex items-center gap-2 rounded-md px-2 ${big ? 'py-2' : 'py-1.5'}`}>
      <span className="w-4 h-4 rounded-sm border border-dashed border-[var(--color-line-2)] shrink-0" />
      <span className="flex-1 text-[12px] text-ink-3 italic truncate">{slot.label}</span>
    </div>
  )
}

/* ───────────────────────── Small bits ───────────────────────── */

function Tag({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: color }} /> {label}
    </span>
  )
}

function JumpBtn({ children, onClick, accent }: { children: React.ReactNode; onClick: () => void; accent?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={[
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-colors cursor-pointer',
        accent
          ? 'border-[color-mix(in_srgb,var(--color-gold)_35%,transparent)] text-[var(--color-gold)] bg-[color-mix(in_srgb,var(--color-gold)_10%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-gold)_16%,transparent)]'
          : 'hairline text-ink-3 hover:text-ink-2 hover:bg-white/[0.04]',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
