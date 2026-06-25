import type { GroupId, Match, StandingRow } from '../types'
import { TEAMS } from '../data/teams'
import { computeProvisionalStandings, compareBestThirds } from './standings'
import { argDayKey, argTodayKey } from './dateUtils'

const ALL_GROUPS: GroupId[] = ['A','B','C','D','E','F','G','H','I','J','K','L']
// Keep a group's card visible across midnight while/just-after its games run.
const AFTER_KICKOFF_MS = 6 * 60 * 60 * 1000

/**
 * Rank of every group's 3rd-placed team among all 12 thirds (group → index).
 * Computed once and shared so the 12-group sweep isn't rebuilt per card.
 */
export function bestThirdRanks(allMatches: Match[]): Record<string, number> {
  const thirds = ALL_GROUPS.map(g => {
    const gm = allMatches.filter(m => m.group === g)
    const gt = TEAMS.filter(t => t.group === g)
    const rows = computeProvisionalStandings(gt, gm)
    return rows[2] ? { row: rows[2], group: g } : null
  }).filter((x): x is { row: StandingRow; group: GroupId } => x !== null)
  thirds.sort((a, b) => compareBestThirds(a.row, b.row))
  const map: Record<string, number> = {}
  thirds.forEach((t, i) => { map[t.group] = i })
  return map
}

/**
 * Groups whose final (simultaneous) matchday falls on *today* in Argentina time
 * — shown all day: before kickoff (fixtures), during (live), and after (final).
 * Also kept up for a few hours past kickoff so a late game that finishes after
 * midnight doesn't vanish the moment the calendar day flips.
 */
export function definingGroupsFor(allMatches: Match[], now: number): GroupId[] {
  const todayKey = argTodayKey(now)
  return ALL_GROUPS.filter(g => {
    const gm = allMatches
      .filter(m => m.group === g)
      .sort((a, b) => +new Date(a.date) - +new Date(b.date))
    const finalPair = gm.slice(-2)
    if (finalPair.length < 2) return false
    const last = finalPair[finalPair.length - 1]
    const onToday = finalPair.every(m => argDayKey(m.date) === todayKey)
    const kickoff = +new Date(last.date)
    const inAfterWindow = now >= kickoff && now - kickoff < AFTER_KICKOFF_MS
    return onToday || inAfterWindow
  })
}
