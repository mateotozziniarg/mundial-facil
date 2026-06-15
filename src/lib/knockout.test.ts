import { describe, it, expect } from 'vitest'
import { lca, nodeToRound, getPossibleLeaves } from '../data/bracket'
import { computeCrossings } from './knockout'

describe('lca (lowest common ancestor)', () => {
  it('same node → itself', () => {
    expect(lca(44, 44)).toBe(44)
  })

  it('siblings (same R32 match) → R32 parent', () => {
    // Leaves 44 and 45 are children of node 22 (R32 match M79)
    expect(lca(44, 45)).toBe(22)   // 22 = R32 → round 'r32'
    expect(nodeToRound(22)).toBe('r32')
  })

  it('different R32 matches in same R16 → R16 parent', () => {
    // M73 leaves = 32,33; M74 leaves = 34,35 → share R16 parent 8
    expect(lca(32, 34)).toBe(8)
    expect(nodeToRound(8)).toBe('r16')
  })

  it('different R16 in same QF → QF parent', () => {
    // M89(node8) and M90(node9) → share QF node 4
    expect(lca(32, 36)).toBe(4)
    expect(nodeToRound(4)).toBe('qf')
  })

  it('different QFs in same SF → SF', () => {
    // SF1 (node 2) contains QF1 (node4, leaves 32-39) and QF2 (node5, leaves 40-47)
    // leaf 32 is in QF1, leaf 40 is in QF2 → LCA is SF1 (node 2)
    expect(lca(32, 40)).toBe(2)
    expect(nodeToRound(2)).toBe('sf')
  })

  it('teams in opposite halves → Final', () => {
    // Left half: leaves 32-47, Right half: leaves 48-63
    expect(lca(32, 60)).toBe(1)
    expect(nodeToRound(1)).toBe('final')
  })
})

describe('getPossibleLeaves', () => {
  it('1st place gives single deterministic leaf', () => {
    expect(getPossibleLeaves('A', 1)).toHaveLength(1)
    expect(getPossibleLeaves('B', 1)).toHaveLength(1)
  })

  it('2nd place gives single deterministic leaf', () => {
    expect(getPossibleLeaves('A', 2)).toHaveLength(1)
    expect(getPossibleLeaves('L', 2)).toHaveLength(1)
  })

  it('3rd place gives multiple possible leaves', () => {
    expect(getPossibleLeaves('A', 3).length).toBeGreaterThan(1)
    expect(getPossibleLeaves('E', 3).length).toBeGreaterThan(1)
  })

  it('3rd from group K → only one slot (3EHIJK)', () => {
    expect(getPossibleLeaves('K', 3)).toHaveLength(1)
  })

  it('3rd from group L → only one slot (3DEIJL)', () => {
    expect(getPossibleLeaves('L', 3)).toHaveLength(1)
  })
})

describe('computeCrossings', () => {
  it('Argentina (J) vs France (I) 1° vs 1° → Final', () => {
    const crossings = computeCrossings('J', 'I')
    const main = crossings.find(c => c.pos1 === 1 && c.pos2 === 1)!
    expect(main).toBeDefined()
    expect(main.round).toBe('final')
  })

  it('Argentina (J) vs Portugal (K) 1° vs 1° → meet in QF', () => {
    // J1=leaf58 (M86/treeIdx29), K1=leaf60 (M87/treeIdx30)
    // Both in R16 node14 and node15 subtrees → share QF4 (node 7)
    const crossings = computeCrossings('J', 'K')
    const main = crossings.find(c => c.pos1 === 1 && c.pos2 === 1)!
    expect(main.round).toBe('qf')
  })

  it('same group → should not be called (returns something safe)', () => {
    // computeCrossings is designed for different groups; calling same group is caller's fault
    // but it still returns values without crashing
    const crossings = computeCrossings('A', 'A')
    expect(crossings).toHaveLength(9)  // 3×3
  })

  it('returns 9 scenarios (3 positions × 3 positions)', () => {
    const crossings = computeCrossings('A', 'B')
    expect(crossings).toHaveLength(9)
  })
})
