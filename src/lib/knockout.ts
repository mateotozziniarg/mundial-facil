import type { GroupId } from '../types'
import {
  getPossibleLeaves,
  lca,
  nodeToRound,
  ROUND_LABELS,
  type BracketRound,
} from '../data/bracket'

export interface CrossScenario {
  pos1: 1 | 2 | 3
  pos2: 1 | 2 | 3
  round: BracketRound
  roundLabel: string
  isAmbiguous: boolean  // depends on which thirds qualify
}

/**
 * Computes all crossing scenarios between two teams from different groups.
 * Returns one entry per (pos1, pos2) combination that's plausible,
 * with the earliest round they could meet.
 */
export function computeCrossings(
  group1: GroupId,
  group2: GroupId,
): CrossScenario[] {
  const positions = [1, 2, 3] as const
  const results: CrossScenario[] = []

  for (const p1 of positions) {
    for (const p2 of positions) {
      const leaves1 = getPossibleLeaves(group1, p1)
      const leaves2 = getPossibleLeaves(group2, p2)

      // For each combination of possible leaves, compute LCA
      const rounds = new Set<BracketRound>()
      for (const l1 of leaves1) {
        for (const l2 of leaves2) {
          const ancestor = lca(l1, l2)
          rounds.add(nodeToRound(ancestor))
        }
      }

      // Earliest possible round = minimum (closest to leaves = higher tree index)
      const roundOrder: BracketRound[] = ['r32', 'r16', 'qf', 'sf', 'final']
      const earliestRound = roundOrder.find(r => rounds.has(r))!

      // If leaves are deterministic for both (no thirds) → no ambiguity
      const isAmbiguous = (p1 === 3 || p2 === 3) && rounds.size > 1

      results.push({
        pos1: p1,
        pos2: p2,
        round: earliestRound,
        roundLabel: ROUND_LABELS[earliestRound],
        isAmbiguous,
      })
    }
  }

  return results
}

export { ROUND_LABELS }
