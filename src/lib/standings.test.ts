import { describe, it, expect } from 'vitest'
import { computeStandings, computeProvisionalStandings, compareBestThirds } from './standings'
import type { Match, Team } from '../types'

const mkTeam = (id: string): Team => ({ id, name: id, flag: '🏳', code: 'xx', group: 'A' })

const mkMatch = (
  id: number,
  homeTeamId: string,
  awayTeamId: string,
  homeScore: number,
  awayScore: number,
): Match => ({
  id, homeTeamId, awayTeamId, homeScore, awayScore,
  minute: null, status: 'finished',
  date: '2026-06-11T20:00:00Z',
  venue: 'Stadium', city: 'City',
  group: 'A', stage: 'group',
})

describe('computeStandings', () => {
  const teams = ['T1','T2','T3','T4'].map(mkTeam)

  it('orders by points', () => {
    const matches: Match[] = [
      mkMatch(1, 'T1', 'T2', 2, 0),
      mkMatch(2, 'T3', 'T4', 1, 1),
      mkMatch(3, 'T1', 'T3', 3, 0),
      mkMatch(4, 'T2', 'T4', 1, 0),
      mkMatch(5, 'T1', 'T4', 1, 0),
      mkMatch(6, 'T2', 'T3', 1, 0),
    ]
    const rows = computeStandings(teams, matches)
    expect(rows[0].team.id).toBe('T1')  // 9 pts
    expect(rows[0].points).toBe(9)
    expect(rows[1].team.id).toBe('T2')  // 6 pts
    expect(rows[3].team.id).toBe('T3')  // 1 pt, worse GD than T4
  })

  it('uses goal difference as secondary tiebreaker', () => {
    const matches: Match[] = [
      mkMatch(1, 'T1', 'T2', 1, 0),   // T1=3pts, T2=0
      mkMatch(2, 'T3', 'T4', 1, 0),   // T3=3pts, T4=0
      mkMatch(3, 'T1', 'T3', 0, 0),   // both 1pt
      mkMatch(4, 'T2', 'T4', 3, 0),
      mkMatch(5, 'T1', 'T4', 2, 0),
      mkMatch(6, 'T2', 'T3', 0, 5),
    ]
    const rows = computeStandings(teams, matches)
    // T1: 3+1+3=7pts, T3: 3+1+3=7pts — but T3 bigger GD via goals
    expect(rows[0].points).toBe(rows[1].points)   // tied on pts
    // Check that the one with better GD is ranked higher
    expect(rows[0].goalDiff).toBeGreaterThanOrEqual(rows[1].goalDiff)
  })

  it('marks first two as qualified and third as possible-third after matchday 3', () => {
    // All 6 matches played
    const matches: Match[] = [
      mkMatch(1, 'T1', 'T2', 1, 0),
      mkMatch(2, 'T3', 'T4', 1, 0),
      mkMatch(3, 'T1', 'T3', 1, 0),
      mkMatch(4, 'T2', 'T4', 1, 0),
      mkMatch(5, 'T1', 'T4', 1, 0),
      mkMatch(6, 'T2', 'T3', 1, 0),
    ]
    const rows = computeStandings(teams, matches)
    expect(rows[0].qualified).toBe('direct')
    expect(rows[1].qualified).toBe('direct')
    expect(rows[2].qualified).toBe('possible-third')
    expect(rows[3].qualified).toBe('eliminated')
  })

  it('provisional standings fold in the current score of live matches', () => {
    const teams = ['T1', 'T2', 'T3', 'T4'].map(mkTeam)
    // Round 1 & 2 finished: T1 6pts, T2 3, T3 3, T4 0
    const finished: Match[] = [
      mkMatch(1, 'T1', 'T2', 1, 0),
      mkMatch(2, 'T3', 'T4', 1, 0),
      mkMatch(3, 'T1', 'T3', 1, 0),
      mkMatch(4, 'T2', 'T4', 1, 0),
    ]
    // Final matchday live right now: T4 currently beating T1, T2 beating T3
    const live: Match[] = [
      { ...mkMatch(5, 'T1', 'T4', 0, 2), status: 'live', minute: 70 },
      { ...mkMatch(6, 'T2', 'T3', 1, 0), status: 'live', minute: 70 },
    ]
    const matches = [...finished, ...live]

    // Final standings ignore the live games (T1 still top on 6 pts)
    expect(computeStandings(teams, matches)[0].team.id).toBe('T1')

    // Provisional folds them in: T2 = 3+3 = 6, T1 = 6 (lost live), T4 = 0+3 = 3
    const prov = computeProvisionalStandings(teams, matches)
    expect(prov[0].team.id).toBe('T2')        // 6 pts, would qualify
    expect(prov[0].qualified).toBe('direct')
    expect(prov[2].qualified).toBe('possible-third')
    expect(prov[3].qualified).toBe('eliminated')
  })

  it('compareBestThirds sorts by pts then GD then GF', () => {
    const a = { points: 4, goalDiff: 1, goalsFor: 2 } as any
    const b = { points: 4, goalDiff: 2, goalsFor: 1 } as any
    const c = { points: 4, goalDiff: 2, goalsFor: 3 } as any
    expect(compareBestThirds(a, b)).toBeGreaterThan(0)  // b before a
    expect(compareBestThirds(b, c)).toBeGreaterThan(0)  // c before b
  })
})
