export type GroupId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L'

export interface Team {
  id: string
  name: string
  shortName?: string   // for tight spaces
  flag: string         // emoji fallback
  code: string         // ISO 3166-1 for flag CDN (e.g. 'ar', 'gb-eng')
  group: GroupId
}

export type MatchStatus = 'scheduled' | 'live' | 'finished'

export interface GoalEvent {
  teamId: string
  playerName: string
  minute: number
  extraMinute?: number | null
  isPenalty?: boolean
  isOwnGoal?: boolean
}

export interface CardEvent {
  teamId: string
  playerName: string
  minute: number
  extraMinute?: number | null
  isRed: boolean  // false = yellow, true = red or second yellow
}

export interface Match {
  id: number
  homeTeamId: string
  awayTeamId: string
  homeScore: number | null
  awayScore: number | null
  minute: number | null
  status: MatchStatus
  date: string
  venue: string
  city: string
  group: GroupId | null
  stage: Stage
  // Live-state fields — populated by ESPN refresh, absent on static fixtures
  extraMinute?: number | null
  period?: number | null
  isHalftime?: boolean
  aet?: boolean
  homePenalties?: number | null
  awayPenalties?: number | null
  scorers?: GoalEvent[]
  cards?: CardEvent[]
  homePossession?: number | null   // 0-100
  awayPossession?: number | null
  attendance?: number | null
  referee?: string | null
}

export type Stage =
  | 'group'
  | 'r32'
  | 'r16'
  | 'qf'
  | 'sf'
  | 'third'
  | 'final'

export interface StandingRow {
  team: Team
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
  position: number
  qualified: 'direct' | 'possible-third' | 'eliminated' | null
}

// Bracket tree node
export interface BracketNode {
  matchNumber: number
  round: Stage
  leftChild: number | null   // matchNumber of left R32 match feeding this
  rightChild: number | null  // matchNumber of right R32 match feeding this
  // For R32 leaf matches:
  slot1: SlotDescriptor | null
  slot2: SlotDescriptor | null
}

export type SlotType = 'winner' | 'runner-up' | 'third'

export interface SlotDescriptor {
  type: SlotType
  group: GroupId
  possibleGroups?: GroupId[]  // for third-place slots
}

export type Round = 'r32' | 'r16' | 'qf' | 'sf' | 'final'

export interface CalculatorResult {
  team1Slot: SlotDescriptor
  team2Slot: SlotDescriptor
  earliestRound: Round
  leaf1: number
  leaf2: number
}

export interface CrossingResult {
  team1: Team
  team1Position: 1 | 2 | 3
  team2: Team
  team2Position: 1 | 2 | 3
  earliestRound: Round
  isAmbiguous: boolean  // true if depends on 3rd-place combination
}
