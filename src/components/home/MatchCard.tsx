import type { Match } from '../../types'
import { TEAM_MAP } from '../../data/teams'
import { formatArgTime, formatArgDate } from '../../lib/dateUtils'

const STAGE_LABELS: Record<string, string> = {
  group: 'Fase de Grupos',
  r32:   'Dieciseisavos',
  r16:   'Octavos',
  qf:    'Cuartos',
  sf:    'Semifinal',
  final: 'Final',
  third: '3.er Puesto',
}

interface Props {
  match: Match
  style?: React.CSSProperties
}

export function MatchCard({ match, style }: Props) {
  const home = TEAM_MAP.get(match.homeTeamId)
  const away = TEAM_MAP.get(match.awayTeamId)
  if (!home || !away) return null

  const isLive     = match.status === 'live'
  const isFinished = match.status === 'finished'
  const groupLabel = match.group ? `Grupo ${match.group}` : STAGE_LABELS[match.stage] ?? match.stage

  return (
    <div
      style={style}
      className={[
        'card fade-up p-4 transition-all duration-200 hover:border-[#2e4060]',
        isLive ? 'border-red-500/40 bg-red-950/10' : '',
      ].join(' ')}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] text-slate-500 font-medium">{groupLabel}</span>
        <StatusBadge match={match} />
      </div>

      {/* Score row */}
      <div className="flex items-center justify-between gap-3">
        {/* Home */}
        <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
          <span className="text-3xl">{home.flag}</span>
          <span className="text-xs text-slate-300 text-center leading-tight font-medium truncate w-full text-center">{home.name}</span>
        </div>

        {/* Score */}
        <div className="flex items-center gap-2 shrink-0">
          {isFinished || isLive ? (
            <>
              <span className={`text-2xl font-bold tabular-nums ${isLive ? 'text-white' : 'text-slate-200'}`}>
                {match.homeScore ?? '–'}
              </span>
              <span className="text-slate-600 text-lg font-light">:</span>
              <span className={`text-2xl font-bold tabular-nums ${isLive ? 'text-white' : 'text-slate-200'}`}>
                {match.awayScore ?? '–'}
              </span>
            </>
          ) : (
            <div className="text-center">
              <div className="text-lg font-semibold text-slate-300">{formatArgTime(match.date)}</div>
              <div className="text-[10px] text-slate-600">{formatArgDate(match.date)}</div>
            </div>
          )}
        </div>

        {/* Away */}
        <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
          <span className="text-3xl">{away.flag}</span>
          <span className="text-xs text-slate-300 text-center leading-tight font-medium truncate w-full text-center">{away.name}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between text-[10px] text-slate-600">
        <span>{match.venue}</span>
        <span>{match.city}</span>
      </div>
    </div>
  )
}

function StatusBadge({ match }: { match: Match }) {
  if (match.status === 'live') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 live-pulse inline-block" />
        EN VIVO{match.minute ? ` ${match.minute}'` : ''}
      </span>
    )
  }
  if (match.status === 'finished') {
    return <span className="text-[10px] text-slate-600">Final</span>
  }
  return (
    <span className="text-[10px] text-blue-500/70 font-medium">
      {formatArgTime(match.date)} ART
    </span>
  )
}
