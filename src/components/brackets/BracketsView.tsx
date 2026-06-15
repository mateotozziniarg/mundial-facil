import { useWorldCupStore } from '../../store/useWorldCupStore'
import { projectBracket, matchesByRound, type ProjectedMatch, type ProjectedSlot } from '../../lib/bracketProjection'
import { ROUND_LABELS, type BracketRound } from '../../data/bracket'
import { Flag } from '../ui/Flag'
import { isArgentina } from '../../data/teams'
import { formatArgDate } from '../../lib/dateUtils'

const ORDER: BracketRound[] = ['r32', 'r16', 'qf', 'sf', 'final']
const SHORT: Record<BracketRound, string> = {
  r32: '16avos', r16: 'Octavos', qf: 'Cuartos', sf: 'Semis', final: 'Final',
}

export function BracketsView() {
  const { getAllStandings, getBestThirds } = useWorldCupStore()
  const standings = getAllStandings()
  const thirdGroups = getBestThirds().map(t => t.group)
  const projected = projectBracket(standings, thirdGroups)
  const byRound = matchesByRound(projected)

  const anyPlayed = ORDER.some(() =>
    Object.values(standings).some(rows => rows.some(r => r.played > 0)))

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Llaves Proyectadas</h1>
          <p className="text-sm text-ink-3 mt-1">
            Cómo quedaría el cuadro <span className="text-[var(--color-grass)] font-medium">si la fase de grupos terminara hoy</span>.
            Los dieciseisavos se arman con la tabla actual; los terceros se asignan según el sistema oficial (Annex C).
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
            <div key={round} className="flex flex-col" style={{ width: 230 }}>
              <RoundHeader round={round} count={byRound[round].length} />
              <div className="flex-1 flex flex-col justify-around gap-2">
                {byRound[round].map((m, i) => (
                  <MatchBox key={m.matchNum} m={m} style={{ animationDelay: `${i * 25}ms` }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-ink-3">
        * Octavos en adelante muestran de qué partido proviene cada equipo (no se puede saber el ganador todavía).
        El partido por el 3.er puesto se juega el 18/7.
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

function MatchBox({ m, style }: { m: ProjectedMatch; style?: React.CSSProperties }) {
  const hasArg = m.top.team && isArgentina(m.top.team.id) || m.bottom.team && isArgentina(m.bottom.team.id)
  return (
    <div
      style={style}
      className={`panel fade-up overflow-hidden ${hasArg ? 'arg-glow' : ''}`}
    >
      <div className="flex items-center justify-between px-2.5 pt-1.5">
        <span className="text-[9px] font-semibold text-ink-3">#{m.matchNum}</span>
        <span className="text-[9px] text-ink-3">{formatArgDate(m.date)}</span>
      </div>
      <div className="px-1.5 pb-1.5 pt-1 space-y-px">
        <SlotRow slot={m.top} />
        <SlotRow slot={m.bottom} />
      </div>
    </div>
  )
}

function SlotRow({ slot }: { slot: ProjectedSlot }) {
  const arg = slot.team && isArgentina(slot.team.id)
  const posColor =
    slot.position === 1 ? 'var(--color-grass)' :
    slot.position === 2 ? 'var(--color-ink-2)' :
    slot.position === 3 ? 'var(--color-gold)' : 'transparent'

  if (slot.team) {
    return (
      <div className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/[0.03]">
        <Flag team={slot.team} size={16} />
        <span className={`flex-1 text-[12.5px] truncate ${arg ? 'arg-text font-semibold' : 'text-ink font-medium'}`}>
          {slot.team.shortName ?? slot.team.name}{arg && ' ★'}
        </span>
        {slot.position && (
          <span className="text-[9px] font-bold px-1 rounded" style={{ color: posColor }}>
            {slot.position}°
          </span>
        )}
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
