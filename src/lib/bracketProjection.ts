import type { GroupId, StandingRow, Team } from '../types'
import {
  R32_MATCHES, R16_MATCHES, QF_MATCHES, SF_MATCHES, FINAL, THIRD_PLACE,
  type BracketRound,
} from '../data/bracket'

export interface ProjectedSlot {
  team: Team | null
  label: string            // "1A", "Mejor 3°", "Ganador 73"
  group?: GroupId
  position?: 1 | 2 | 3
  resolved: boolean        // true when a concrete team is known
}

export interface ProjectedMatch {
  matchNum: number
  round: BracketRound
  date: string
  top: ProjectedSlot
  bottom: ProjectedSlot
}

// treeIdx → matchNum
const TREE_TO_MATCH: Record<number, number> = {
  1: 104, 2: 101, 3: 102, 4: 97, 5: 98, 6: 99, 7: 100,
  8: 89, 9: 90, 10: 91, 11: 92, 12: 93, 13: 94, 14: 95, 15: 96,
}
for (let t = 16; t <= 31; t++) TREE_TO_MATCH[t] = t + 57  // 16→73 … 31→88

/**
 * Backtracking perfect matching of qualifying third-place GROUPS to the
 * eight third-place R32 slots, respecting each slot's allowed groups
 * (the FIFA "3ABCDF"-style constraints = Annex C reduced to slot domains).
 */
export function assignThirds(qualifyingGroups: GroupId[]): Record<number, GroupId> {
  const slots = R32_MATCHES
    .filter(m => m.kind2 === 'third')
    .map(m => ({ matchNum: m.matchNum, allowed: (m.possibleGroups2 ?? []) as GroupId[] }))

  const result: Record<number, GroupId> = {}
  const used = new Set<GroupId>()

  // Order slots by fewest viable options first (faster, more deterministic)
  const order = [...slots].sort((a, b) => {
    const av = a.allowed.filter(g => qualifyingGroups.includes(g)).length
    const bv = b.allowed.filter(g => qualifyingGroups.includes(g)).length
    return av - bv
  })

  function backtrack(i: number): boolean {
    if (i === order.length) return true
    const slot = order[i]
    for (const g of slot.allowed) {
      if (!qualifyingGroups.includes(g) || used.has(g)) continue
      result[slot.matchNum] = g
      used.add(g)
      if (backtrack(i + 1)) return true
      used.delete(g)
      delete result[slot.matchNum]
    }
    return false
  }

  backtrack(0)
  return result
}

function teamAt(standings: Record<GroupId, StandingRow[]>, group: GroupId, pos: 0 | 1 | 2): Team | null {
  return standings[group]?.[pos]?.team ?? null
}

/**
 * Builds the full projected bracket (matches 73–104 + 3rd place) using the
 * CURRENT standings: group winners/runners are deterministic, the 8 best
 * thirds are matched into their slots. R16+ show "Ganador N" placeholders.
 */
export function projectBracket(
  standings: Record<GroupId, StandingRow[]>,
  bestThirdGroups: GroupId[],   // ordered; we take the top 8
): ProjectedMatch[] {
  const qualifyingThirds = bestThirdGroups.slice(0, 8)
  const thirdAssignment = assignThirds(qualifyingThirds)

  const matches: ProjectedMatch[] = []

  // ─── R32 (real teams) ──────────────────────────────────────────────
  for (const m of R32_MATCHES) {
    const top: ProjectedSlot = {
      team: m.kind1 === 'winner' ? teamAt(standings, m.group1!, 0) : teamAt(standings, m.group1!, 1),
      label: m.label1,
      group: m.group1,
      position: m.kind1 === 'winner' ? 1 : 2,
      resolved: true,
    }

    let bottom: ProjectedSlot
    if (m.kind2 === 'third') {
      const g = thirdAssignment[m.matchNum]
      bottom = g
        ? { team: teamAt(standings, g, 2), label: `3° ${g}`, group: g, position: 3, resolved: true }
        : { team: null, label: m.label2, position: 3, resolved: false }
    } else {
      bottom = {
        team: m.kind2 === 'winner' ? teamAt(standings, m.group2!, 0) : teamAt(standings, m.group2!, 1),
        label: m.label2,
        group: m.group2,
        position: m.kind2 === 'winner' ? 1 : 2,
        resolved: true,
      }
    }

    matches.push({ matchNum: m.matchNum, round: 'r32', date: m.date, top, bottom })
  }

  // ─── R16 / QF / SF / Final (placeholders) ──────────────────────────
  const ph = (childTreeIdx: number): ProjectedSlot => ({
    team: null,
    label: `Ganador ${TREE_TO_MATCH[childTreeIdx]}`,
    resolved: false,
  })

  for (const m of R16_MATCHES)
    matches.push({ matchNum: m.matchNum, round: 'r16', date: m.date, top: ph(m.r32Left), bottom: ph(m.r32Right) })
  for (const m of QF_MATCHES)
    matches.push({ matchNum: m.matchNum, round: 'qf', date: m.date, top: ph(m.r16Left), bottom: ph(m.r16Right) })
  for (const m of SF_MATCHES)
    matches.push({ matchNum: m.matchNum, round: 'sf', date: m.date, top: ph(m.qfLeft), bottom: ph(m.qfRight) })

  matches.push({
    matchNum: THIRD_PLACE.matchNum, round: 'sf', date: THIRD_PLACE.date,
    top: { team: null, label: 'Perdedor SF1', resolved: false },
    bottom: { team: null, label: 'Perdedor SF2', resolved: false },
  })
  matches.push({
    matchNum: FINAL.matchNum, round: 'final', date: FINAL.date,
    top: ph(FINAL.sfLeft), bottom: ph(FINAL.sfRight),
  })

  return matches
}

export function matchesByRound(matches: ProjectedMatch[]): Record<BracketRound, ProjectedMatch[]> {
  const out: Record<BracketRound, ProjectedMatch[]> = { r32: [], r16: [], qf: [], sf: [], final: [] }
  for (const m of matches) out[m.round].push(m)
  return out
}
