import { describe, it, expect } from 'vitest'
import { assignThirds } from './bracketProjection'
import type { GroupId } from '../types'

const ALL: GroupId[] = ['A','B','C','D','E','F','G','H','I','J','K','L']

// All C(12,8) = 495 ways the eight best thirds can come from the groups
function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]]
  if (k > arr.length) return []
  const [head, ...rest] = arr
  return [
    ...combinations(rest, k - 1).map(c => [head, ...c]),
    ...combinations(rest, k),
  ]
}

describe('assignThirds — Annex C slot matching', () => {
  const subsets = combinations(ALL, 8)

  it('there are exactly 495 possible third-place combinations', () => {
    expect(subsets.length).toBe(495)
  })

  it('every combination yields a complete, valid perfect matching', () => {
    const failures: string[] = []
    for (const subset of subsets) {
      const res = assignThirds(subset)
      const assignedGroups = Object.values(res)
      const assignedSlots = Object.keys(res)

      // 8 slots filled
      if (assignedSlots.length !== 8) { failures.push(`incomplete: ${subset.join('')}`); continue }
      // each qualifying group used exactly once
      const unique = new Set(assignedGroups)
      if (unique.size !== 8) { failures.push(`dup: ${subset.join('')}`); continue }
      // assigned groups are exactly the subset
      if (!subset.every(g => unique.has(g))) failures.push(`mismatch: ${subset.join('')}`)
    }
    expect(failures).toEqual([])
  })

  it('respects each slot domain (a group only lands in a slot that allows it)', () => {
    const DOMAINS: Record<number, GroupId[]> = {
      74: ['A','B','C','D','F'],
      77: ['C','D','F','G','H'],
      79: ['C','E','F','H','I'],
      80: ['E','H','I','J','K'],
      81: ['B','E','F','I','J'],
      82: ['A','E','H','I','J'],
      85: ['E','F','G','I','J'],
      87: ['D','E','I','J','L'],
    }
    const res = assignThirds(['A','C','E','G','I','J','K','L'])
    for (const [slot, group] of Object.entries(res)) {
      expect(DOMAINS[Number(slot)]).toContain(group)
    }
  })
})
