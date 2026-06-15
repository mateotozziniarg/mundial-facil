import type { GroupId } from '../types'

/**
 * Official 2026 FIFA World Cup knockout bracket.
 *
 * Binary tree indexed 1..63:
 *   - 1       = Final (M104)
 *   - 2-3     = Semis (M101, M102)
 *   - 4-7     = QF (M97-M100)
 *   - 8-15    = R16 (M89-M96)
 *   - 16-31   = R32 (M73-M88)
 *   - 32-63   = Team slots (leaves)
 *
 * Parent of node i = floor(i/2)
 * Depth of node i = floor(log2(i))
 */

export type SlotKind = 'winner' | 'runner' | 'third'

export interface LeafSlot {
  index: number   // 32..63
  kind: SlotKind
  group?: GroupId                // for winner/runner
  possibleGroups?: GroupId[]     // for third-place slots
  label: string                  // e.g. "1A", "2B", "3ABCDF"
}

// Official R32 matchups (FIFA match numbers 73–88)
// match index in bracket tree = 16..31
export const R32_MATCHES = [
  // [treeIdx, matchNum, slot1Label, slot1Kind, slot1Group(s), slot2Label, slot2Kind, slot2Group(s)]
  { treeIdx: 16, matchNum: 73, date: '2026-06-28', label1: '2A', label2: '2B',        kind1: 'runner' as SlotKind, group1: 'A' as GroupId,              kind2: 'runner' as SlotKind, group2: 'B' as GroupId },
  { treeIdx: 17, matchNum: 74, date: '2026-06-29', label1: '1E', label2: '3ABCDF',   kind1: 'winner' as SlotKind, group1: 'E' as GroupId,              kind2: 'third'  as SlotKind, possibleGroups2: ['A','B','C','D','F'] as GroupId[] },
  { treeIdx: 18, matchNum: 75, date: '2026-06-29', label1: '1F', label2: '2C',        kind1: 'winner' as SlotKind, group1: 'F' as GroupId,              kind2: 'runner' as SlotKind, group2: 'C' as GroupId },
  { treeIdx: 19, matchNum: 76, date: '2026-06-29', label1: '1C', label2: '2F',        kind1: 'winner' as SlotKind, group1: 'C' as GroupId,              kind2: 'runner' as SlotKind, group2: 'F' as GroupId },
  { treeIdx: 20, matchNum: 77, date: '2026-06-30', label1: '1I', label2: '3CDFGH',   kind1: 'winner' as SlotKind, group1: 'I' as GroupId,              kind2: 'third'  as SlotKind, possibleGroups2: ['C','D','F','G','H'] as GroupId[] },
  { treeIdx: 21, matchNum: 78, date: '2026-06-30', label1: '2E', label2: '2I',        kind1: 'runner' as SlotKind, group1: 'E' as GroupId,              kind2: 'runner' as SlotKind, group2: 'I' as GroupId },
  { treeIdx: 22, matchNum: 79, date: '2026-07-01', label1: '1A', label2: '3CEFHI',   kind1: 'winner' as SlotKind, group1: 'A' as GroupId,              kind2: 'third'  as SlotKind, possibleGroups2: ['C','E','F','H','I'] as GroupId[] },
  { treeIdx: 23, matchNum: 80, date: '2026-07-01', label1: '1L', label2: '3EHIJK',   kind1: 'winner' as SlotKind, group1: 'L' as GroupId,              kind2: 'third'  as SlotKind, possibleGroups2: ['E','H','I','J','K'] as GroupId[] },
  { treeIdx: 24, matchNum: 81, date: '2026-07-02', label1: '1D', label2: '3BEFIJ',   kind1: 'winner' as SlotKind, group1: 'D' as GroupId,              kind2: 'third'  as SlotKind, possibleGroups2: ['B','E','F','I','J'] as GroupId[] },
  { treeIdx: 25, matchNum: 82, date: '2026-07-01', label1: '1G', label2: '3AEHIJ',   kind1: 'winner' as SlotKind, group1: 'G' as GroupId,              kind2: 'third'  as SlotKind, possibleGroups2: ['A','E','H','I','J'] as GroupId[] },
  { treeIdx: 26, matchNum: 83, date: '2026-07-02', label1: '2K', label2: '2L',        kind1: 'runner' as SlotKind, group1: 'K' as GroupId,              kind2: 'runner' as SlotKind, group2: 'L' as GroupId },
  { treeIdx: 27, matchNum: 84, date: '2026-07-02', label1: '1H', label2: '2J',        kind1: 'winner' as SlotKind, group1: 'H' as GroupId,              kind2: 'runner' as SlotKind, group2: 'J' as GroupId },
  { treeIdx: 28, matchNum: 85, date: '2026-07-03', label1: '1B', label2: '3EFGIJ',   kind1: 'winner' as SlotKind, group1: 'B' as GroupId,              kind2: 'third'  as SlotKind, possibleGroups2: ['E','F','G','I','J'] as GroupId[] },
  { treeIdx: 29, matchNum: 86, date: '2026-07-03', label1: '1J', label2: '2H',        kind1: 'winner' as SlotKind, group1: 'J' as GroupId,              kind2: 'runner' as SlotKind, group2: 'H' as GroupId },
  { treeIdx: 30, matchNum: 87, date: '2026-07-04', label1: '1K', label2: '3DEIJL',   kind1: 'winner' as SlotKind, group1: 'K' as GroupId,              kind2: 'third'  as SlotKind, possibleGroups2: ['D','E','I','J','L'] as GroupId[] },
  { treeIdx: 31, matchNum: 88, date: '2026-07-03', label1: '2D', label2: '2G',        kind1: 'runner' as SlotKind, group1: 'D' as GroupId,              kind2: 'runner' as SlotKind, group2: 'G' as GroupId },
] as const

// R16 pairings: each R16 match pairs two R32 winners
// Tree indices 8-15 pair with R32 indices 16-31
// M89=W(73)vsW(74), M90=W(75)vsW(76), M91=W(77)vsW(78), M92=W(79)vsW(80)
// M93=W(81)vsW(82), M94=W(83)vsW(84), M95=W(85)vsW(86), M96=W(87)vsW(88)
export const R16_MATCHES = [
  { treeIdx: 8,  matchNum: 89, date: '2026-07-04', r32Left: 16, r32Right: 17 },
  { treeIdx: 9,  matchNum: 90, date: '2026-07-05', r32Left: 18, r32Right: 19 },
  { treeIdx: 10, matchNum: 91, date: '2026-07-05', r32Left: 20, r32Right: 21 },
  { treeIdx: 11, matchNum: 92, date: '2026-07-06', r32Left: 22, r32Right: 23 },
  { treeIdx: 12, matchNum: 93, date: '2026-07-06', r32Left: 24, r32Right: 25 },
  { treeIdx: 13, matchNum: 94, date: '2026-07-06', r32Left: 26, r32Right: 27 },
  { treeIdx: 14, matchNum: 95, date: '2026-07-07', r32Left: 28, r32Right: 29 },
  { treeIdx: 15, matchNum: 96, date: '2026-07-07', r32Left: 30, r32Right: 31 },
]

export const QF_MATCHES = [
  { treeIdx: 4, matchNum: 97,  date: '2026-07-09', r16Left: 8,  r16Right: 9  },
  { treeIdx: 5, matchNum: 98,  date: '2026-07-09', r16Left: 10, r16Right: 11 },
  { treeIdx: 6, matchNum: 99,  date: '2026-07-10', r16Left: 12, r16Right: 13 },
  { treeIdx: 7, matchNum: 100, date: '2026-07-11', r16Left: 14, r16Right: 15 },
]

export const SF_MATCHES = [
  { treeIdx: 2, matchNum: 101, date: '2026-07-14', qfLeft: 4, qfRight: 5 },
  { treeIdx: 3, matchNum: 102, date: '2026-07-15', qfLeft: 6, qfRight: 7 },
]

export const THIRD_PLACE = { treeIdx: -1, matchNum: 103, date: '2026-07-18' }
export const FINAL        = { treeIdx: 1,  matchNum: 104, date: '2026-07-19', sfLeft: 2, sfRight: 3 }

// Given (group, position), return possible leaf indices (32..63)
// Leaves map: leaf = 32 + 2*(treeIdx-16) + side (0=left, 1=right)
function leafOf(treeIdx: number, side: 0 | 1): number {
  return 32 + 2 * (treeIdx - 16) + side
}

// For each 1st/2nd place, deterministic leaf
const WINNER_LEAF: Record<GroupId, number> = {
  A: leafOf(22, 0),   // 1A → M79 left
  B: leafOf(28, 0),   // 1B → M85 left
  C: leafOf(19, 0),   // 1C → M76 left
  D: leafOf(24, 0),   // 1D → M81 left
  E: leafOf(17, 0),   // 1E → M74 left
  F: leafOf(18, 0),   // 1F → M75 left
  G: leafOf(25, 0),   // 1G → M82 left
  H: leafOf(27, 0),   // 1H → M84 left
  I: leafOf(20, 0),   // 1I → M77 left
  J: leafOf(29, 0),   // 1J → M86 left
  K: leafOf(30, 0),   // 1K → M87 left
  L: leafOf(23, 0),   // 1L → M80 left
}

const RUNNER_LEAF: Record<GroupId, number> = {
  A: leafOf(16, 0),   // 2A → M73 left
  B: leafOf(16, 1),   // 2B → M73 right
  C: leafOf(18, 1),   // 2C → M75 right
  D: leafOf(31, 0),   // 2D → M88 left
  E: leafOf(21, 0),   // 2E → M78 left
  F: leafOf(19, 1),   // 2F → M76 right
  G: leafOf(31, 1),   // 2G → M88 right
  H: leafOf(29, 1),   // 2H → M86 right
  I: leafOf(21, 1),   // 2I → M78 right
  J: leafOf(27, 1),   // 2J → M84 right
  K: leafOf(26, 0),   // 2K → M83 left
  L: leafOf(26, 1),   // 2L → M83 right
}

// Third-place: group → possible leaf indices
const THIRD_LEAVES: Record<GroupId, number[]> = {
  A: [leafOf(17,1), leafOf(25,1)],                                             // 3ABCDF, 3AEHIJ
  B: [leafOf(17,1), leafOf(24,1)],                                             // 3ABCDF, 3BEFIJ
  C: [leafOf(17,1), leafOf(20,1), leafOf(22,1)],                              // 3ABCDF, 3CDFGH, 3CEFHI
  D: [leafOf(17,1), leafOf(20,1), leafOf(30,1)],                              // 3ABCDF, 3CDFGH, 3DEIJL
  E: [leafOf(22,1), leafOf(23,1), leafOf(24,1), leafOf(25,1), leafOf(28,1), leafOf(30,1)],
  F: [leafOf(17,1), leafOf(20,1), leafOf(22,1), leafOf(24,1), leafOf(28,1)],
  G: [leafOf(20,1), leafOf(28,1)],                                             // 3CDFGH, 3EFGIJ
  H: [leafOf(20,1), leafOf(22,1), leafOf(23,1), leafOf(25,1)],
  I: [leafOf(22,1), leafOf(23,1), leafOf(24,1), leafOf(25,1), leafOf(28,1), leafOf(30,1)],
  J: [leafOf(23,1), leafOf(24,1), leafOf(25,1), leafOf(28,1), leafOf(30,1)],
  K: [leafOf(23,1)],                                                            // 3EHIJK only
  L: [leafOf(30,1)],                                                            // 3DEIJL only
}

export function getPossibleLeaves(group: GroupId, position: 1 | 2 | 3): number[] {
  if (position === 1) return [WINNER_LEAF[group]]
  if (position === 2) return [RUNNER_LEAF[group]]
  return THIRD_LEAVES[group]
}

/** Lowest common ancestor in the bracket binary tree */
export function lca(a: number, b: number): number {
  while (a !== b) {
    if (a > b) a = Math.floor(a / 2)
    else b = Math.floor(b / 2)
  }
  return a
}

export type BracketRound = 'r32' | 'r16' | 'qf' | 'sf' | 'final'

export function nodeToRound(n: number): BracketRound {
  if (n >= 16) return 'r32'
  if (n >= 8)  return 'r16'
  if (n >= 4)  return 'qf'
  if (n >= 2)  return 'sf'
  return 'final'
}

export const ROUND_LABELS: Record<BracketRound, string> = {
  r32:   'Dieciseisavos',
  r16:   'Octavos de Final',
  qf:    'Cuartos de Final',
  sf:    'Semifinal',
  final: 'Final',
}
