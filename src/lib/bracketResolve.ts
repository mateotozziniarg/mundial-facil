import type { GroupId, Match, StandingRow, Team } from '../types'
import { TEAM_MAP } from '../data/teams'
import { winnerOf } from './knockoutBuild'
import { TREE_TO_MATCH, assignThirds } from './bracketProjection'
import {
  R32_MATCHES, R16_MATCHES, QF_MATCHES, SF_MATCHES, FINAL, THIRD_PLACE,
  type BracketRound,
} from '../data/bracket'

export interface BracketSlot {
  team: Team | null
  label: string                 // "1A", "3° C", "Ganador 73"
  position?: 1 | 2 | 3
  score: number | null
  pens: number | null
  isWinner: boolean
}

export interface BracketGame {
  matchNum: number
  round: BracketRound
  date: string
  status: 'scheduled' | 'live' | 'finished'
  top: BracketSlot
  bottom: BracketSlot
}

function teamAt(standings: Record<GroupId, StandingRow[]>, group: GroupId, pos: 0 | 1 | 2): Team | null {
  return standings[group]?.[pos]?.team ?? null
}

function slot(team: Team | null, label: string, position?: 1 | 2 | 3): BracketSlot {
  return { team, label, position, score: null, pens: null, isWinner: false }
}

/** Score (and pens) a given team scored in an actual match, from its perspective. */
function scoreFor(m: Match, teamId: string): { score: number | null; pens: number | null } {
  if (m.homeTeamId === teamId) return { score: m.homeScore, pens: m.homePenalties ?? null }
  if (m.awayTeamId === teamId) return { score: m.awayScore, pens: m.awayPenalties ?? null }
  return { score: null, pens: null }
}

/**
 * Builds the bracket from ACTUAL knockout results in `allMatches`, propagating
 * winners round by round. R32 matchups are identified by each match's
 * deterministic slot-1 team (group winner/runner), so they're correct even if
 * our third-place assignment differs from FIFA's. Slots that aren't decided yet
 * fall back to a "Ganador N" placeholder.
 */
export function resolveBracket(
  standings: Record<GroupId, StandingRow[]>,
  bestThirdGroups: GroupId[],
  allMatches: Match[],
): BracketGame[] {
  const ko = allMatches.filter(m => m.stage !== 'group')
  const thirdAssignment = assignThirds(bestThirdGroups.slice(0, 8))
  const winners: Record<number, string> = {}   // matchNum → winning teamId
  const games: BracketGame[] = []

  const findActual = (stage: string, teamId: string | undefined): Match | undefined =>
    teamId ? ko.find(m => m.stage === stage && (m.homeTeamId === teamId || m.awayTeamId === teamId)) : undefined

  const statusOf = (m?: Match): BracketGame['status'] => (m ? m.status : 'scheduled')

  // Fill a game's slots/scores from an actual match (when we have one).
  const fill = (matchNum: number, round: BracketRound, fallbackDate: string,
                a: { team: Team | null; label: string; position?: 1 | 2 | 3 },
                b: { team: Team | null; label: string; position?: 1 | 2 | 3 },
                actual?: Match) => {
    const top = slot(a.team, a.label, a.position)
    const bottom = slot(b.team, b.label, b.position)
    if (actual) {
      const w = winnerOf(actual)
      if (a.team) { const s = scoreFor(actual, a.team.id); top.score = s.score; top.pens = s.pens; top.isWinner = w === a.team.id }
      if (b.team) { const s = scoreFor(actual, b.team.id); bottom.score = s.score; bottom.pens = s.pens; bottom.isWinner = w === b.team.id }
      if (w) winners[matchNum] = w
    }
    games.push({ matchNum, round, date: actual?.date ?? fallbackDate, status: statusOf(actual), top, bottom })
  }

  // ── R32: identify each match by its deterministic slot-1 team ──────────────
  for (const def of R32_MATCHES) {
    const slot1 = teamAt(standings, def.group1, def.kind1 === 'winner' ? 0 : 1)
    const actual = findActual('r32', slot1?.id)
    // slot-2 team: prefer the ACTUAL opponent; else the projected third/runner.
    let slot2: Team | null = null
    let label2 = def.label2
    const pos2: 1 | 2 | 3 = def.kind2 === 'winner' ? 1 : def.kind2 === 'third' ? 3 : 2
    if (actual && slot1) {
      const otherId = actual.homeTeamId === slot1.id ? actual.awayTeamId : actual.homeTeamId
      slot2 = TEAM_MAP.get(otherId) ?? null
      if (slot2) label2 = def.kind2 === 'third' ? `3° ${slot2.group}` : `${pos2}${slot2.group}`
    } else if (def.kind2 === 'third') {
      const g = thirdAssignment[def.matchNum]
      if (g) { slot2 = teamAt(standings, g, 2); label2 = `3° ${g}` }
    } else if (def.group2) {
      slot2 = teamAt(standings, def.group2, def.kind2 === 'winner' ? 0 : 1)
    }
    fill(def.matchNum, 'r32', `${def.date}T20:00:00Z`,
      { team: slot1, label: def.label1, position: def.kind1 === 'winner' ? 1 : 2 },
      { team: slot2, label: label2, position: pos2 },
      actual)
  }

  // ── Later rounds: teams = winners of the two feeders ───────────────────────
  const laterRound = (
    defs: { matchNum: number; feeders: [number, number] }[],
    round: BracketRound, stage: string, fallbackDate: (mn: number) => string,
  ) => {
    for (const d of defs) {
      const wL = winners[d.feeders[0]]
      const wR = winners[d.feeders[1]]
      const teamL = wL ? TEAM_MAP.get(wL) ?? null : null
      const teamR = wR ? TEAM_MAP.get(wR) ?? null : null
      const actual = findActual(stage, wL) ?? findActual(stage, wR)
      fill(d.matchNum, round, fallbackDate(d.matchNum),
        { team: teamL, label: teamL ? (teamL.shortName ?? teamL.name) : `Ganador ${d.feeders[0]}` },
        { team: teamR, label: teamR ? (teamR.shortName ?? teamR.name) : `Ganador ${d.feeders[1]}` },
        actual)
    }
  }

  laterRound(R16_MATCHES.map(m => ({ matchNum: m.matchNum, feeders: [TREE_TO_MATCH[m.r32Left], TREE_TO_MATCH[m.r32Right]] as [number, number] })),
    'r16', 'r16', mn => `${R16_MATCHES.find(x => x.matchNum === mn)!.date}T20:00:00Z`)
  laterRound(QF_MATCHES.map(m => ({ matchNum: m.matchNum, feeders: [TREE_TO_MATCH[m.r16Left], TREE_TO_MATCH[m.r16Right]] as [number, number] })),
    'qf', 'qf', mn => `${QF_MATCHES.find(x => x.matchNum === mn)!.date}T20:00:00Z`)
  laterRound(SF_MATCHES.map(m => ({ matchNum: m.matchNum, feeders: [TREE_TO_MATCH[m.qfLeft], TREE_TO_MATCH[m.qfRight]] as [number, number] })),
    'sf', 'sf', mn => `${SF_MATCHES.find(x => x.matchNum === mn)!.date}T20:00:00Z`)
  laterRound([{ matchNum: FINAL.matchNum, feeders: [TREE_TO_MATCH[FINAL.sfLeft], TREE_TO_MATCH[FINAL.sfRight]] }],
    'final', 'final', () => `${FINAL.date}T20:00:00Z`)

  // ── Third-place play-off: losers of the two semifinals ─────────────────────
  const sf1 = ko.find(m => m.stage === 'sf' && winners[SF_MATCHES[0].matchNum] &&
    (m.homeTeamId === winners[SF_MATCHES[0].matchNum] || m.awayTeamId === winners[SF_MATCHES[0].matchNum]))
  const sf2 = ko.find(m => m.stage === 'sf' && winners[SF_MATCHES[1].matchNum] &&
    (m.homeTeamId === winners[SF_MATCHES[1].matchNum] || m.awayTeamId === winners[SF_MATCHES[1].matchNum]))
  const loser = (m?: Match): Team | null => {
    const w = winnerOf(m)
    if (!w || !m) return null
    const id = w === m.homeTeamId ? m.awayTeamId : m.homeTeamId
    return TEAM_MAP.get(id) ?? null
  }
  const l1 = loser(sf1), l2 = loser(sf2)
  const thirdActual = findActual('third', l1?.id) ?? findActual('third', l2?.id)
  fill(THIRD_PLACE.matchNum, 'final', `${THIRD_PLACE.date}T20:00:00Z`,
    { team: l1, label: l1 ? (l1.shortName ?? l1.name) : 'Perdedor SF1' },
    { team: l2, label: l2 ? (l2.shortName ?? l2.name) : 'Perdedor SF2' },
    thirdActual)

  return games
}

export function gamesByRound(games: BracketGame[]): Record<BracketRound, BracketGame[]> {
  const out: Record<BracketRound, BracketGame[]> = { r32: [], r16: [], qf: [], sf: [], final: [] }
  for (const g of games) out[g.round].push(g)
  return out
}
