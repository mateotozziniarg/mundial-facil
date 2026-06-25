import { describe, it, expect } from 'vitest'
import { definingGroupsFor, bestThirdRanks } from './groupDefinition'
import { FIXTURES } from '../data/fixtures'

describe('definingGroupsFor', () => {
  it('returns the groups whose final matchday falls on today (ART)', () => {
    // ART noon on 2026-06-25 == 15:00 UTC
    const now = Date.parse('2026-06-25T15:00:00Z')
    const groups = definingGroupsFor(FIXTURES, now)
    // Final pairs on ART 2026-06-25: D (02:00Z→ART 23:00 prev?), E, F
    expect(groups).toEqual(['D', 'E', 'F'])
  })

  it('returns the 24 Jun groups the day before', () => {
    const now = Date.parse('2026-06-24T15:00:00Z')
    const groups = definingGroupsFor(FIXTURES, now)
    expect(groups).toEqual(['A', 'B', 'C'])
  })

  it('keeps a group visible just past midnight via the after-kickoff window', () => {
    // Group F kicks off 2026-06-25T23:00Z; 1h later it is 2026-06-26 ART
    const now = Date.parse('2026-06-26T00:00:00Z')
    const groups = definingGroupsFor(FIXTURES, now)
    // F's final pair (23:00Z) is within 6h → still shown even though the ART
    // day has flipped to the 26th
    expect(groups).toContain('F')
  })

  it('drops a group once the after-kickoff window has elapsed', () => {
    // 7h after F's 23:00Z kickoff = 2026-06-26T06:00Z, ART day is the 26th
    const now = Date.parse('2026-06-26T06:00:00Z')
    const groups = definingGroupsFor(FIXTURES, now)
    expect(groups).not.toContain('F')
  })
})

describe('bestThirdRanks', () => {
  it('ranks all 12 groups thirds as a 0..11 permutation', () => {
    const ranks = bestThirdRanks(FIXTURES)
    const values = Object.values(ranks).sort((a, b) => a - b)
    expect(Object.keys(ranks).length).toBe(12)
    expect(values).toEqual(Array.from({ length: 12 }, (_, i) => i))
  })
})
