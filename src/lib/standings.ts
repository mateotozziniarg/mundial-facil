import type { Match, Team, StandingRow, GroupId } from '../types'

interface HeadToHeadStats {
  points: number
  goalDiff: number
  goalsFor: number
}

function h2hStats(teamId: string, opponents: string[], matches: Match[]): HeadToHeadStats {
  let pts = 0, gf = 0, ga = 0
  for (const m of matches) {
    if (m.status !== 'finished' || m.homeScore === null || m.awayScore === null) continue
    const isHome = m.homeTeamId === teamId && opponents.includes(m.awayTeamId)
    const isAway = m.awayTeamId === teamId && opponents.includes(m.homeTeamId)
    if (isHome) {
      gf += m.homeScore; ga += m.awayScore
      pts += m.homeScore > m.awayScore ? 3 : m.homeScore === m.awayScore ? 1 : 0
    } else if (isAway) {
      gf += m.awayScore; ga += m.homeScore
      pts += m.awayScore > m.homeScore ? 3 : m.homeScore === m.awayScore ? 1 : 0
    }
  }
  return { points: pts, goalDiff: gf - ga, goalsFor: gf }
}

function buildRow(team: Team, groupMatches: Match[]): Omit<StandingRow, 'position' | 'qualified'> {
  let played = 0, won = 0, drawn = 0, lost = 0, gf = 0, ga = 0

  for (const m of groupMatches) {
    if (m.status !== 'finished' || m.homeScore === null || m.awayScore === null) continue
    const isHome = m.homeTeamId === team.id
    const isAway = m.awayTeamId === team.id
    if (!isHome && !isAway) continue

    played++
    const ts = isHome ? m.homeScore : m.awayScore
    const os = isHome ? m.awayScore : m.homeScore
    gf += ts; ga += os
    if (ts > os) won++
    else if (ts === os) drawn++
    else lost++
  }

  return {
    team,
    played,
    won,
    drawn,
    lost,
    goalsFor: gf,
    goalsAgainst: ga,
    goalDiff: gf - ga,
    points: won * 3 + drawn,
  }
}

/**
 * Sorts group standings by FIFA 2026 tiebreaker rules:
 * 1. Points  2. Goal diff  3. Goals for
 * 4. H2H points (among tied teams)  5. H2H goal diff  6. H2H goals for
 * 7. Fair play (approximated — not tracked in seed)  8. Drawing of lots
 */
export function computeStandings(
  teams: Team[],
  groupMatches: Match[],
  _group: GroupId,
): StandingRow[] {
  const rows = teams.map(t => buildRow(t, groupMatches))

  rows.sort((a, b) => {
    // 1. Points
    if (b.points !== a.points) return b.points - a.points
    // 2. Goal difference
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff
    // 3. Goals for
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
    // 4-6. Head-to-head among tied teams
    const tiedIds = rows
      .filter(r => r.points === a.points && r.goalDiff === a.goalDiff && r.goalsFor === a.goalsFor)
      .map(r => r.team.id)
    if (tiedIds.length > 1) {
      const ha = h2hStats(a.team.id, tiedIds.filter(id => id !== a.team.id), groupMatches)
      const hb = h2hStats(b.team.id, tiedIds.filter(id => id !== b.team.id), groupMatches)
      if (hb.points   !== ha.points)   return hb.points   - ha.points
      if (hb.goalDiff !== ha.goalDiff) return hb.goalDiff - ha.goalDiff
      if (hb.goalsFor !== ha.goalsFor) return hb.goalsFor - ha.goalsFor
    }
    // Alphabetical fallback (stable)
    return a.team.name.localeCompare(b.team.name)
  })

  const matchesPlayed = Math.max(...rows.map(r => r.played), 0)
  const maxMatchdays = 3

  return rows.map((row, i) => {
    let qualified: StandingRow['qualified'] = null
    if (matchesPlayed >= maxMatchdays) {
      qualified = i < 2 ? 'direct' : i === 2 ? 'possible-third' : 'eliminated'
    } else if (matchesPlayed > 0) {
      qualified = i < 2 ? 'direct' : i === 2 ? 'possible-third' : null
    }
    return { ...row, position: i + 1, qualified }
  })
}

// For "best thirds" ranking across all groups
export function compareBestThirds(a: StandingRow, b: StandingRow): number {
  if (b.points   !== a.points)   return b.points   - a.points
  if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
  return a.team.name.localeCompare(b.team.name)
}
