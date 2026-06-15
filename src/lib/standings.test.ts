import { describe, it, expect } from 'vitest'
import { computeStandings, compareBestThirds } from './standings'
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
    const rows = computeStandings(teams, matches, 'A')
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
    const rows = computeStandings(teams, matches, 'A')
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
    const rows = computeStandings(teams, matches, 'A')
    expect(rows[0].qualified).toBe('direct')
    expect(rows[1].qualified).toBe('direct')
    expect(rows[2].qualified).toBe('possible-third')
    expect(rows[3].qualified).toBe('eliminated')
  })

  it('compareBestThirds sorts by pts then GD then GF', () => {
    const a = { points: 4, goalDiff: 1, goalsFor: 2 } as any
    const b = { points: 4, goalDiff: 2, goalsFor: 1 } as any
    const c = { points: 4, goalDiff: 2, goalsFor: 3 } as any
    expect(compareBestThirds(a, b)).toBeGreaterThan(0)  // b before a
    expect(compareBestThirds(b, c)).toBeGreaterThan(0)  // c before b
  })
})
