import type { GroupId, Match, StandingRow, Stage, Team } from '../types'
import { TEAMS } from '../data/teams'
import { computeStandings, compareBestThirds } from './standings'
import { projectBracket, TREE_TO_MATCH, MATCH_TO_TREE, type ProjectedMatch } from './bracketProjection'
import {
  R16_MATCHES, QF_MATCHES, SF_MATCHES, FINAL, THIRD_PLACE,
  ROUND_LABELS, nodeToRound,
} from '../data/bracket'

const ALL_GROUPS: GroupId[] = ['A','B','C','D','E','F','G','H','I','J','K','L']

// Default kickoff for a generated knockout match: 20:00 UTC keeps the Argentina
// calendar day equal to the bracket date. ESPN overrides this with the real
// kickoff once the match is in the live/scheduled window.
function koDate(dateOnly: string): string {
  return `${dateOnly}T20:00:00Z`
}

// matchNum → bracket date (date-only). R32 dates come from the projection;
// the later rounds + third-place come from the official bracket arrays.
const KO_DATE: Record<number, string> = {}
for (const m of R16_MATCHES) KO_DATE[m.matchNum] = m.date
for (const m of QF_MATCHES)  KO_DATE[m.matchNum] = m.date
for (const m of SF_MATCHES)  KO_DATE[m.matchNum] = m.date
KO_DATE[FINAL.matchNum] = FINAL.date
KO_DATE[THIRD_PLACE.matchNum] = THIRD_PLACE.date

// ─── Standings helpers (group stage) ──────────────────────────────────────────

function standingsByGroup(groupMatches: Match[]): Record<GroupId, StandingRow[]> {
  const out = {} as Record<GroupId, StandingRow[]>
  for (const g of ALL_GROUPS) {
    out[g] = computeStandings(TEAMS.filter(t => t.group === g), groupMatches.filter(m => m.group === g))
  }
  return out
}

function bestThirdsOrder(standings: Record<GroupId, StandingRow[]>): GroupId[] {
  const thirds = ALL_GROUPS
    .map(g => (standings[g]?.[2] ? { row: standings[g][2], g } : null))
    .filter((x): x is { row: StandingRow; g: GroupId } => x !== null)
  thirds.sort((a, b) => compareBestThirds(a.row, b.row))
  return thirds.map(t => t.g)
}

function groupStageComplete(groupMatches: Match[]): boolean {
  return groupMatches.length >= 72
    && groupMatches.every(m => m.status === 'finished' && m.homeScore != null && m.awayScore != null)
}

/** Infer the knockout round from a match date (used when ingesting an ESPN
 *  event we didn't have a seed for). Falls back to 'r32' for anything earlier. */
export function stageForDate(iso: string | null | undefined): Stage {
  const t = iso ? +new Date(iso) : NaN
  if (isNaN(t)) return 'r32'
  if (t < +new Date('2026-07-04T00:00:00Z')) return 'r32'
  if (t < +new Date('2026-07-08T00:00:00Z')) return 'r16'
  if (t < +new Date('2026-07-12T00:00:00Z')) return 'qf'
  if (t < +new Date('2026-07-17T00:00:00Z')) return 'sf'
  if (t < +new Date('2026-07-19T00:00:00Z')) return 'third'
  return 'final'
}

// ─── Winner / loser of a decided knockout match ───────────────────────────────

export function winnerOf(m: Match | undefined): string | null {
  if (!m || m.status !== 'finished' || m.homeScore == null || m.awayScore == null) return null
  if (m.homeScore > m.awayScore) return m.homeTeamId
  if (m.awayScore > m.homeScore) return m.awayTeamId
  // Regulation/AET tie → penalty shootout
  if (m.homePenalties != null && m.awayPenalties != null) {
    if (m.homePenalties > m.awayPenalties) return m.homeTeamId
    if (m.awayPenalties > m.homePenalties) return m.awayTeamId
  }
  return null
}

export function loserOf(m: Match | undefined): string | null {
  const w = winnerOf(m)
  if (!w || !m) return null
  return w === m.homeTeamId ? m.awayTeamId : m.homeTeamId
}

function koMatch(num: number, stage: Stage, homeId: string, awayId: string, dateOnly: string): Match {
  return {
    id: num,
    homeTeamId: homeId,
    awayTeamId: awayId,
    homeScore: null, awayScore: null, minute: null,
    status: 'scheduled',
    date: koDate(dateOnly),
    venue: '', city: '',
    group: null,
    stage,
  }
}

/**
 * Returns every knockout match that can be determined from the current data:
 *   - R32 once the group stage is complete (teams from the final standings)
 *   - each later-round match once BOTH of its feeder winners are known
 * Matches that already exist (by id) in `allMatches` are reused for winner
 * lookup but NOT re-emitted — the returned list is only the *new* matches to add.
 */
export function buildDeterminedKnockout(allMatches: Match[]): Match[] {
  const group = allMatches.filter(m => m.stage === 'group')
  if (!groupStageComplete(group)) return []

  const standings = standingsByGroup(group)
  const thirds = bestThirdsOrder(standings)
  const projected = projectBracket(standings, thirds)

  const pool = new Map<number, Match>(allMatches.map(m => [m.id, m]))
  const built: Match[] = []

  const ensure = (num: number, stage: Stage, homeId: string, awayId: string, dateOnly: string) => {
    if (pool.has(num)) return pool.get(num)!
    const m = koMatch(num, stage, homeId, awayId, dateOnly)
    pool.set(num, m)
    built.push(m)
    return m
  }

  // R32 — teams from the projection (winners/runners + assigned thirds)
  for (const p of projected) {
    if (p.round !== 'r32' || !p.top.team || !p.bottom.team) continue
    ensure(p.matchNum, 'r32', p.top.team.id, p.bottom.team.id, p.date)
  }

  // R16 → QF → SF → Final, each from its feeders' winners
  const buildRound = (defs: { matchNum: number; feeders: [number, number]; stage: Stage }[]) => {
    for (const d of defs) {
      const a = winnerOf(pool.get(d.feeders[0]))
      const b = winnerOf(pool.get(d.feeders[1]))
      if (a && b) ensure(d.matchNum, d.stage, a, b, KO_DATE[d.matchNum])
    }
  }

  buildRound(R16_MATCHES.map(m => ({ matchNum: m.matchNum, stage: 'r16' as Stage, feeders: [TREE_TO_MATCH[m.r32Left], TREE_TO_MATCH[m.r32Right]] as [number, number] })))
  buildRound(QF_MATCHES.map(m => ({ matchNum: m.matchNum, stage: 'qf' as Stage, feeders: [TREE_TO_MATCH[m.r16Left], TREE_TO_MATCH[m.r16Right]] as [number, number] })))
  buildRound(SF_MATCHES.map(m => ({ matchNum: m.matchNum, stage: 'sf' as Stage, feeders: [TREE_TO_MATCH[m.qfLeft], TREE_TO_MATCH[m.qfRight]] as [number, number] })))
  buildRound([{ matchNum: FINAL.matchNum, stage: 'final' as Stage, feeders: [TREE_TO_MATCH[FINAL.sfLeft], TREE_TO_MATCH[FINAL.sfRight]] }])

  // Third-place play-off: losers of the two semifinals
  const l1 = loserOf(pool.get(SF_MATCHES[0].matchNum))
  const l2 = loserOf(pool.get(SF_MATCHES[1].matchNum))
  if (l1 && l2) ensure(THIRD_PLACE.matchNum, 'third', l1, l2, KO_DATE[THIRD_PLACE.matchNum])

  return built
}

// ─── "Who would the winner play next" (forward path for a knockout card) ──────

export interface NextCross {
  nextMatchNum: number
  nextRoundLabel: string
  oppMatchNum: number
  oppTeams: [Team | null, Team | null]
  oppLabels: [string, string]
}

/** For a knockout match, the match its winner advances to and that match's
 *  other side (the sibling feeder) — resolved to teams when those are known. */
export function nextCrossFor(matchNum: number, projected: ProjectedMatch[]): NextCross | null {
  const treeIdx = MATCH_TO_TREE[matchNum]
  if (treeIdx == null || treeIdx <= 1) return null   // the final has no "next"
  const parentIdx = Math.floor(treeIdx / 2)
  const siblingIdx = treeIdx ^ 1
  const nextMatchNum = TREE_TO_MATCH[parentIdx]
  const oppMatchNum = TREE_TO_MATCH[siblingIdx]
  const sib = projected.find(p => p.matchNum === oppMatchNum)
  return {
    nextMatchNum,
    nextRoundLabel: ROUND_LABELS[nodeToRound(parentIdx)],
    oppMatchNum,
    oppTeams: [sib?.top.team ?? null, sib?.bottom.team ?? null],
    oppLabels: [sib?.top.label ?? `Ganador ${oppMatchNum}`, sib?.bottom.label ?? '—'],
  }
}
