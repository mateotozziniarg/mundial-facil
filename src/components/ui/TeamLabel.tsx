import type { Team } from '../../types'
import { Flag } from './Flag'
import { isArgentina } from '../../data/teams'

interface Props {
  team: Team
  flagSize?: number
  short?: boolean
  className?: string
  nameClassName?: string
  reverse?: boolean        // flag on the right
}

/** Flag + name, with Argentina's name tinted celeste. */
export function TeamLabel({ team, flagSize = 20, short = false, className = '', nameClassName = '', reverse = false }: Props) {
  const name = short ? (team.shortName ?? team.name) : team.name
  const arg = isArgentina(team.id)
  return (
    <span className={`inline-flex items-center gap-2 min-w-0 ${reverse ? 'flex-row-reverse' : ''} ${className}`}>
      <Flag team={team} size={flagSize} />
      <span className={`truncate ${arg ? 'arg-text font-semibold' : ''} ${nameClassName}`}>
        {name}
        {arg && <span className="ml-1" aria-hidden>★</span>}
      </span>
    </span>
  )
}
