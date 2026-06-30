import { useWorldCupStore } from '../../store/useWorldCupStore'
import { resolveBracket, gamesByRound, type BracketGame, type BracketSlot } from '../../lib/bracketResolve'
import { ROUND_LABELS, type BracketRound } from '../../data/bracket'
import { Flag } from '../ui/Flag'
import { isArgentina } from '../../data/teams'
import { formatArgDate, effectiveStatus } from '../../lib/dateUtils'

const ORDER: BracketRound[] = ['r32', 'r16', 'qf', 'sf', 'final']
const SHORT: Record<BracketRound, string> = {
  r32: '16avos', r16: 'Octavos', qf: 'Cuartos', sf: 'Semis', final: 'Final',
}

export function BracketsView() {
  const { getAllStandings, getBestThirds } = useWorldCupStore()
  const matches = useWorldCupStore(s => s.matches)
  const standings = getAllStandings()
  const thirdGroups = getBestThirds().map(t => t.group)
  const games = resolveBracket(standings, thirdGroups, matches)
  const byRound = gamesByRound(games)

  const anyResult = games.some(g => g.top.score != null || g.bottom.score != null)
  const anyPlayed = Object.values(standings).some(rows => rows.some(r => r.played > 0))

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Llaves</h1>
          <p className="text-sm text-ink-3 mt-1">
            {anyResult
              ? <>El cuadro se va completando con los <span className="text-[var(--color-grass)] font-medium">resultados reales</span>: el ganador de cada llave avanza a la siguiente.</>
              : <>Cómo quedaría el cuadro <span className="text-[var(--color-grass)] font-medium">si la fase de grupos terminara hoy</span>. Se va a ir completando con cada partido jugado.</>}
          </p>
        </div>
      </div>

      {!anyPlayed && (
        <div className="panel px-4 py-3 text-xs text-ink-3">
          Todavía no hay resultados suficientes: el cuadro muestra el orden inicial de cada grupo.
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-ink-3">
        <Tag color="var(--color-grass)" label="1° de grupo" />
        <Tag color="var(--color-ink-2)" label="2° de grupo" />
        <Tag color="var(--color-gold)" label="Mejor 3°" />
        <span className="text-ink-3">· deslizá horizontalmente para ver toda la llave →</span>
      </div>

      {/* Bracket */}
      <div className="scroll-x overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max items-stretch">
          {ORDER.map(round => (
            <div key={round} className="flex flex-col" style={{ width: 240 }}>
              <RoundHeader round={round} count={byRound[round].length} />
              <div className="flex-1 flex flex-col justify-around gap-2">
                {byRound[round].map((g, i) => (
                  <MatchBox key={g.matchNum} g={g} style={{ animationDelay: `${i * 25}ms` }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-ink-3">
        * Los octavos en adelante se completan a medida que terminan los partidos. El partido por el 3.er puesto se juega el 18/7.
      </p>
    </div>
  )
}

function RoundHeader({ round, count }: { round: BracketRound; count: number }) {
  return (
    <div className="shrink-0 bg-[var(--color-raised)]/70 backdrop-blur-sm rounded-lg px-3 py-2.5 border hairline text-center mb-3">
      <div className="text-[13px] font-bold text-white">{SHORT[round]}</div>
      <div className="text-[10px] text-ink-3">{ROUND_LABELS[round]} · {count}</div>
    </div>
  )
}

function MatchBox({ g, style }: { g: BracketGame; style?: React.CSSProperties }) {
  const hasArg = (g.top.team && isArgentina(g.top.team.id)) || (g.bottom.team && isArgentina(g.bottom.team.id))
  const status = effectiveStatus(g.status, g.date)
  const live = status === 'live'
  return (
    <div
      style={{ ...style, borderColor: live ? 'color-mix(in srgb, var(--color-live) 45%, transparent)' : undefined }}
      className={`panel fade-up overflow-hidden ${hasArg ? 'arg-glow' : ''}`}
    >
      <div className="flex items-center justify-between px-2.5 pt-1.5">
        <span className="text-[9px] font-semibold text-ink-3">#{g.matchNum}</span>
        {live
          ? <span className="text-[8.5px] font-bold text-[var(--color-live)] inline-flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-[var(--color-live)] live-dot inline-block" />EN VIVO</span>
          : <span className="text-[9px] text-ink-3">{formatArgDate(g.date)}</span>}
      </div>
      <div className="px-1.5 pb-1.5 pt-1 space-y-px">
        <SlotRow slot={g.top} status={status} />
        <SlotRow slot={g.bottom} status={status} />
      </div>
    </div>
  )
}

function SlotRow({ slot, status }: { slot: BracketSlot; status: 'scheduled' | 'live' | 'finished' }) {
  const arg = slot.team && isArgentina(slot.team.id)
  const posColor =
    slot.position === 1 ? 'var(--color-grass)' :
    slot.position === 2 ? 'var(--color-ink-2)' :
    slot.position === 3 ? 'var(--color-gold)' : 'transparent'
  const showScore = (status === 'finished' || status === 'live') && slot.score != null
  const dim = status === 'finished' && !slot.isWinner

  if (slot.team) {
    return (
      <div className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${slot.isWinner ? 'bg-[var(--color-grass)]/10' : 'hover:bg-white/[0.03]'} ${dim ? 'opacity-55' : ''}`}>
        <Flag team={slot.team} size={16} />
        <span className={`flex-1 text-[12.5px] truncate ${arg ? 'arg-text font-semibold' : slot.isWinner ? 'text-white font-semibold' : 'text-ink font-medium'}`}>
          {slot.team.shortName ?? slot.team.name}{arg && ' ★'}
        </span>
        {slot.isWinner && <span className="text-[var(--color-grass)] text-[10px] shrink-0">✓</span>}
        {showScore ? (
          <span className={`text-[13px] font-bold nums shrink-0 ${slot.isWinner ? 'text-white' : 'text-ink-2'}`}>
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
    <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
      <span className="w-4 h-4 rounded-sm border border-dashed border-[var(--color-line-2)] shrink-0" />
      <span className="flex-1 text-[12px] text-ink-3 italic truncate">{slot.label}</span>
    </div>
  )
}

function Tag({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: color }} /> {label}
    </span>
  )
}
