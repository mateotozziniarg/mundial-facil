import { describe, it, expect } from 'vitest'
import { resolveBracket } from './bracketResolve'
import { computeStandings, compareBestThirds } from './standings'
import { TEAMS } from '../data/teams'
import { FIXTURES } from '../data/fixtures'
import type { GroupId, Match, StandingRow } from '../types'

const ALL: GroupId[] = ['A','B','C','D','E','F','G','H','I','J','K','L']

function setup() {
  const groups = FIXTURES.map(m => ({ ...m, homeScore: 2, awayScore: 1, status: 'finished' as const }))
  const std = {} as Record<GroupId, StandingRow[]>
  for (const g of ALL) std[g] = computeStandings(TEAMS.filter(t => t.group === g), groups.filter(m => m.group === g))
  const thirds = ALL.map(g => (std[g][2] ? { row: std[g][2], g } : null))
    .filter((x): x is { row: StandingRow; g: GroupId } => x !== null)
    .sort((a, b) => compareBestThirds(a.row, b.row)).map(t => t.g)
  return { groups, std, thirds }
}

const ko = (id: number, stage: Match['stage'], h: string, a: string, hs: number, as_: number): Match => ({
  id, homeTeamId: h, awayTeamId: a, homeScore: hs, awayScore: as_, minute: null,
  status: 'finished', date: '2026-06-28T20:00:00Z', venue: '', city: '', group: null, stage,
})

describe('resolveBracket', () => {
  it('produces 32 games; R32 has real teams, later rounds are placeholders before play', () => {
    const { groups, std, thirds } = setup()
    const games = resolveBracket(std, thirds, groups)
    expect(games.length).toBe(32)
    const r32 = games.filter(g => g.round === 'r32')
    expect(r32.length).toBe(16)
    expect(r32.every(g => g.top.team && g.bottom.team)).toBe(true)
    // R16+ unresolved → at least one placeholder slot, no scores
    const r16 = games.filter(g => g.matchNum >= 89 && g.matchNum <= 96)
    expect(r16.every(g => g.top.team === null && g.bottom.team === null)).toBe(true)
  })

  it('advances the winner of a finished R32 match into the next round', () => {
    const { groups, std, thirds } = setup()
    const base = resolveBracket(std, thirds, groups)
    const g73 = base.find(g => g.matchNum === 73)!
    const homeId = g73.top.team!.id
    const awayId = g73.bottom.team!.id

    const resolved = resolveBracket(std, thirds, [...groups, ko(900001, 'r32', homeId, awayId, 1, 0)])
    const r73 = resolved.find(g => g.matchNum === 73)!
    expect(r73.top.score).toBe(1)
    expect(r73.bottom.score).toBe(0)
    expect(r73.top.isWinner).toBe(true)
    expect(r73.status).toBe('finished')

    // #73 feeds R16 #89 (top slot) → winner should now appear there
    const r89 = resolved.find(g => g.matchNum === 89)!
    expect(r89.top.team?.id).toBe(homeId)
    expect(r89.bottom.team).toBeNull()   // #74 not played yet
  })

  it('decides a tie via penalties', () => {
    const { groups, std, thirds } = setup()
    const base = resolveBracket(std, thirds, groups)
    const g73 = base.find(g => g.matchNum === 73)!
    const homeId = g73.top.team!.id, awayId = g73.bottom.team!.id
    const pens: Match = { ...ko(900002, 'r32', homeId, awayId, 1, 1), homePenalties: 4, awayPenalties: 3 }
    const resolved = resolveBracket(std, thirds, [...groups, pens])
    const r89 = resolved.find(g => g.matchNum === 89)!
    expect(r89.top.team?.id).toBe(homeId)   // penalty winner advanced
  })
})
