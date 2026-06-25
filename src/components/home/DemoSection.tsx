import { useMemo } from 'react'
import { useWorldCupStore } from '../../store/useWorldCupStore'
import { DefiningGroupCard } from './DefiningGroupCard'
import type { GroupId, Match } from '../../types'

const ALL_GROUPS: GroupId[] = ['A','B','C','D','E','F','G','H','I','J','K','L']
// Mock scores for a group's two final-day games — reshuffles the table nicely.
const DEMO_SCORES: [number, number][] = [[1, 0], [0, 2]]

/** Sets a group's last two fixtures to a "live" state with mock scores. */
function injectMockLive(matches: Match[], group: GroupId): Match[] {
  const finalIds = matches
    .filter(m => m.group === group)
    .sort((a, b) => +new Date(a.date) - +new Date(b.date))
    .slice(-2)
    .map(m => m.id)
  const idSet = new Set(finalIds)
  let i = 0
  return matches.map(m => {
    if (!idSet.has(m.id)) return m
    const [hs, as_] = DEMO_SCORES[i++ % 2]
    return { ...m, status: 'live' as const, homeScore: hs, awayScore: as_, minute: 67 + i * 5 }
  })
}

/** Groups whose final matchday hasn't been played yet (good demo candidates). */
function pickDemoGroups(matches: Match[]): GroupId[] {
  return ALL_GROUPS.filter(g => {
    const gm = matches
      .filter(m => m.group === g)
      .sort((a, b) => +new Date(a.date) - +new Date(b.date))
    return gm.slice(-2).every(m => m.status === 'scheduled')
  }).slice(0, 2)
}

interface Props { now: number }

export function DemoSection({ now }: Props) {
  const matches = useWorldCupStore(s => s.matches)

  const { demoGroups, mocked } = useMemo(() => {
    const groups = pickDemoGroups(matches)
    let mocked = matches
    for (const g of groups) mocked = injectMockLive(mocked, g)
    return { demoGroups: groups, mocked }
  }, [matches])

  if (demoGroups.length === 0) {
    return (
      <div className="panel p-5 text-center text-sm text-ink-3">
        No hay grupos con su última fecha pendiente para simular ahora.
        <br />
        <span className="text-[11px]">Volvé a intentarlo cuando estén los fixtures de la siguiente jornada.</span>
      </div>
    )
  }

  return (
    <>
      <p className="-mt-2 text-xs text-ink-3">
        Demo con marcadores de ejemplo · así se verá este panel mientras los dos partidos de un grupo se juegan en simultáneo.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {demoGroups.map(g => (
          <DefiningGroupCard key={g} group={g} allMatches={mocked} now={now} demo />
        ))}
      </div>
    </>
  )
}
