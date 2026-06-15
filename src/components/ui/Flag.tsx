import { useState } from 'react'
import type { Team } from '../../types'

interface Props {
  team: Team
  size?: number          // height in px
  rounded?: boolean
  className?: string
}

/**
 * Real flag via flagcdn.com SVG (works on every OS, unlike emoji flags
 * which don't render on Windows/Chrome). Falls back to the emoji if the
 * image fails to load (e.g. offline).
 */
export function Flag({ team, size = 20, rounded = true, className = '' }: Props) {
  const [failed, setFailed] = useState(false)
  const width = Math.round(size * 1.4)

  if (failed) {
    return (
      <span
        className={className}
        style={{ fontSize: size, lineHeight: 1, display: 'inline-block' }}
        aria-label={team.name}
      >
        {team.flag}
      </span>
    )
  }

  return (
    <img
      src={`https://flagcdn.com/${team.code}.svg`}
      width={width}
      height={size}
      loading="lazy"
      alt={team.name}
      onError={() => setFailed(true)}
      className={className}
      style={{
        width,
        height: size,
        objectFit: 'cover',
        borderRadius: rounded ? 3 : 0,
        boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 1px 2px rgba(0,0,0,0.3)',
        display: 'inline-block',
        flexShrink: 0,
      }}
    />
  )
}
