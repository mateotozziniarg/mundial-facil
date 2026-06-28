import { describe, it, expect } from 'vitest'
import { buildDeterminedKnockout, winnerOf, loserOf } from './knockoutBuild'
import { FIXTURES } from '../data/fixtures'
import type { Match } from '../types'

// All group matches finished (home wins 1-0) → standings fully determined.
function finishedGroups(): Match[] {
  return FIXTURES.map(m => ({
    ...m,
    homeScore: 1, awayScore: 0, status: 'finished' as const,
  }))
}

describe('winnerOf / loserOf', () => {
  const base: Match = {
    id: 73, homeTeamId: 'ARG', awayTeamId: 'BRA', homeScore: null, awayScore: null,
    minute: null, status: 'scheduled', date: '2026-06-28T20:00:00Z', venue: '', city: '',
    group: null, stage: 'r32',
  }
  it('returns null while undecided', () => {
    expect(winnerOf(undefined)).toBeNull()
    expect(winnerOf(base)).toBeNull()
    expect(winnerOf({ ...base, status: 'finished', homeScore: 1, awayScore: 1 })).toBeNull()
  })
  it('picks the higher score', () => {
    expect(winnerOf({ ...base, status: 'finished', homeScore: 2, awayScore: 1 })).toBe('ARG')
    expect(loserOf({ ...base, status: 'finished', homeScore: 2, awayScore: 1 })).toBe('BRA')
  })
  it('breaks a draw on penalties', () => {
    const pens = { ...base, status: 'finished' as const, homeScore: 1, awayScore: 1, homePenalties: 4, awayPenalties: 2 }
    expect(winnerOf(pens)).toBe('ARG')
    expect(loserOf(pens)).toBe('BRA')
  })
})

describe('buildDeterminedKnockout', () => {
  it('returns nothing while the group stage is unfinished', () => {
    expect(buildDeterminedKnockout(FIXTURES)).toEqual([])
  })

  it('materializes all 16 R32 matches with resolved teams once groups end', () => {
    const built = buildDeterminedKnockout(finishedGroups())
    const r32 = built.filter(m => m.stage === 'r32')
    expect(r32.length).toBe(16)
    for (const m of r32) {
      expect(m.homeTeamId).toBeTruthy()
      expect(m.awayTeamId).toBeTruthy()
      expect(m.homeTeamId).not.toBe(m.awayTeamId)
      expect(m.id).toBeGreaterThanOrEqual(73)
      expect(m.id).toBeLessThanOrEqual(88)
    }
    // R16+ cannot exist yet (no R32 winners known)
    expect(built.some(m => m.stage === 'r16')).toBe(false)
  })

  it('is additive — already-present matches are not re-emitted', () => {
    const withR32 = [...finishedGroups(), ...buildDeterminedKnockout(finishedGroups())]
    const again = buildDeterminedKnockout(withR32)
    expect(again.some(m => m.stage === 'r32')).toBe(false)
  })

  it('builds an R16 match once both its R32 feeders are decided', () => {
    const groups = finishedGroups()
    const r32 = buildDeterminedKnockout(groups)
    // M89 feeds from M73 (treeIdx16) and M74 (treeIdx17)
    const decide = (id: number) => {
      const m = r32.find(x => x.id === id)!
      return { ...m, status: 'finished' as const, homeScore: 2, awayScore: 0 }
    }
    const pool = [...groups, ...r32.map(m => (m.id === 73 || m.id === 74 ? decide(m.id) : m))]
    const built = buildDeterminedKnockout(pool)
    const r16 = built.find(m => m.id === 89)
    expect(r16).toBeDefined()
    expect(r16!.stage).toBe('r16')
    // its two teams are the home winners of 73 and 74
    const w73 = pool.find(m => m.id === 73)!.homeTeamId
    const w74 = pool.find(m => m.id === 74)!.homeTeamId
    expect([r16!.homeTeamId, r16!.awayTeamId].sort()).toEqual([w73, w74].sort())
  })
})
