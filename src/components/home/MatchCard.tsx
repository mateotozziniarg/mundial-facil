import type { Match } from '../../types'
import { TEAM_MAP, isArgentina } from '../../data/teams'
import { Flag } from '../ui/Flag'
import { IconClock, IconPin } from '../ui/icons'
import { formatArgTime, formatArgDate, countdownTo, elapsedMinutes, effectiveStatus } from '../../lib/dateUtils'

const STAGE_LABELS: Record<string, string> = {
  group: 'Grupos', r32: 'Dieciseisavos', r16: 'Octavos',
  qf: 'Cuartos', sf: 'Semifinal', final: 'Final', third: '3.er Puesto',
}

interface Props {
  match: Match
  now: number
  style?: React.CSSProperties
}

export function MatchCard({ match, now, style }: Props) {
  const home = TEAM_MAP.get(match.homeTeamId)
  const away = TEAM_MAP.get(match.awayTeamId)
  if (!home || !away) return null

  const status      = effectiveStatus(match.status, match.date, now)
  const isLive      = status === 'live'
  const isFinished  = status === 'finished'
  const hasScore    = match.homeScore !== null && match.awayScore !== null
  const hasArg      = isArgentina(home.id) || isArgentina(away.id)
  const groupLabel  = match.group ? `Grupo ${match.group}` : STAGE_LABELS[match.stage] ?? match.stage
  const minute      = match.minute ?? (isLive ? elapsedMinutes(match.date, now) : null)

  return (
    <div
      style={style}
      className={[
        'relative panel p-4 fade-up transition-all duration-200 hover:border-[var(--color-line-2)]',
        isLive ? 'border-[color-mix(in_srgb,var(--color-live)_40%,transparent)]' : '',
        hasArg ? 'arg-glow' : '',
      ].join(' ')}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <span className="text-[11px] font-medium text-ink-3 uppercase tracking-wide">{groupLabel}</span>
        <StatusBadge status={status} minute={minute} date={match.date} />
      </div>

      {/* Teams + score */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <TeamCol team={home} />

        {/* Score / time */}
        <div className="px-1 min-w-[64px] text-center">
          {(isFinished || isLive) && hasScore ? (
            <div className="flex items-center justify-center gap-1.5">
              <Score value={match.homeScore!} live={isLive} />
              <span className="text-ink-3 text-lg font-light -mt-0.5">:</span>
              <Score value={match.awayScore!} live={isLive} />
            </div>
          ) : isFinished || isLive ? (
            <div className="text-ink-3 text-sm font-medium">{isLive ? 'en juego' : 'FT'}</div>
          ) : (
            <div className="leading-none">
              <div className="text-[19px] font-bold text-ink font-display nums">{formatArgTime(match.date)}</div>
              <div className="text-[10px] text-ink-3 mt-1">{formatArgDate(match.date)}</div>
            </div>
          )}
        </div>

        <TeamCol team={away} />
      </div>

      {/* Countdown for upcoming only */}
      {status === 'scheduled' && (
        <div className="mt-3 flex items-center justify-center">
          <span className="chip chip-soon"><IconClock size={12} /> {countdownTo(match.date, now)}</span>
        </div>
      )}

      {/* Footer venue */}
      <div className="mt-3 pt-3 border-t hairline flex items-center justify-between text-[10.5px] text-ink-3">
        <span className="inline-flex items-center gap-1 truncate"><IconPin size={11} /> {match.venue}</span>
        <span className="truncate ml-2">{match.city}</span>
      </div>
    </div>
  )
}

function TeamCol({ team }: { team: NonNullable<ReturnType<typeof TEAM_MAP.get>> }) {
  const arg = isArgentina(team.id)
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <Flag team={team} size={32} />
      <span className={`text-[13px] font-medium leading-tight ${arg ? 'arg-text font-semibold' : 'text-ink'}`}>
        {team.shortName ?? team.name}{arg && ' ★'}
      </span>
    </div>
  )
}

function Score({ value, live }: { value: number; live: boolean }) {
  return (
    <span
      key={value}
      className={`score-pop text-[26px] font-bold font-display nums leading-none ${live ? 'text-white' : 'text-ink'}`}
    >
      {value}
    </span>
  )
}

function StatusBadge({ status, minute, date }: {
  status: 'scheduled' | 'live' | 'finished'; minute: number | null; date: string
}) {
  if (status === 'live') {
    return (
      <span className="chip chip-live">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-live)] live-dot inline-block" />
        EN VIVO{minute != null ? ` · ${minute}'` : ''}
      </span>
    )
  }
  if (status === 'finished') return <span className="chip chip-done">Finalizado</span>
  return <span className="text-[11px] text-ink-3 font-medium nums">{formatArgTime(date)} ART</span>
}
