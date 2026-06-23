import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Match, StandingRow, GroupId } from '../types'
import { FIXTURES } from '../data/fixtures'
import { TEAMS } from '../data/teams'
import { computeStandings, computeProvisionalStandings, compareBestThirds } from '../lib/standings'
import { fetchLiveMatches } from '../lib/api'
import { effectiveStatus } from '../lib/dateUtils'

type View = 'home' | 'groups' | 'brackets' | 'calculator' | 'calendar'

interface WorldCupState {
  matches: Match[]
  currentView: View
  lastRefresh: number | null
  isRefreshing: boolean
  demoMode: boolean

  // Derived (computed on demand)
  getGroupStandings: (group: GroupId) => StandingRow[]
  getAllStandings: () => Record<GroupId, StandingRow[]>
  getBestThirds: () => (StandingRow & { group: GroupId })[]
  getMatchesForHome: () => { live: Match[]; today: Match[]; tomorrow: Match[] }
  hasLiveMatches: () => boolean
  // Live "as of now" standings that fold in current live scores
  getProvisionalStandings: (group: GroupId) => StandingRow[]
  getProvisionalBestThirds: () => (StandingRow & { group: GroupId })[]
  // Groups whose final (simultaneous) matchday is being played right now
  getLiveDefiningGroups: () => GroupId[]
  getGroupLiveMatches: (group: GroupId) => Match[]

  // Actions
  setView: (v: View) => void
  refresh: (full?: boolean) => Promise<void>
  updateMatchScore: (id: number, homeScore: number, awayScore: number, status: Match['status']) => void
  toggleDemoMode: () => void
}

function nowArgBucket(): string {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    dateStyle: 'short',
  }).format(new Date())
}

function tomorrowArgBucket(): string {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    dateStyle: 'short',
  }).format(new Date(Date.now() + 864e5))
}

function dateArgBucket(iso: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    dateStyle: 'short',
  }).format(new Date(iso))
}

// ─── Demo mode helpers ───────────────────────────────────────────────────────

// Scores injected into the two final-matchday games: makes the table tense
// (home wins first, away wins second → group reshuffle).
const DEMO_SCORES: [number, number][] = [[1, 0], [0, 2]]

/** Returns the group's 6 matches with the last two converted to live + mock scores. */
function injectDemoLive(groupMatches: Match[]): Match[] {
  const sorted = [...groupMatches].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  // Last two by date = the simultaneous final matchday pair
  const lastTwoIds = new Set(sorted.slice(-2).map(m => m.id))
  let scoreIdx = 0
  return groupMatches.map(m => {
    if (!lastTwoIds.has(m.id)) return m
    const [hs, as_] = DEMO_SCORES[scoreIdx++ % DEMO_SCORES.length]
    return {
      ...m,
      status: 'live' as const,
      homeScore: hs,
      awayScore: as_,
      minute: 67 + scoreIdx * 4,
    }
  })
}

/** Groups eligible for demo: 4+ finished matches and 2 scheduled final-pair games. */
function demoGroups(matches: Match[]): GroupId[] {
  const groups: GroupId[] = ['A','B','C','D','E','F','G','H','I','J','K','L']
  return groups.filter(g => {
    const gm = matches.filter(m => m.group === g)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const lastTwo = gm.slice(-2)
    const firstFour = gm.slice(0, 4)
    return (
      lastTwo.every(m => m.status === 'scheduled') &&
      firstFour.some(m => m.status === 'finished')
    )
  }).slice(0, 2)  // cap at 2 for readability
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useWorldCupStore = create<WorldCupState>()(
  persist(
    (set, get) => ({
      matches: FIXTURES,
      currentView: 'home',
      lastRefresh: null,
      isRefreshing: false,
      demoMode: false,

      toggleDemoMode: () => set(s => ({ demoMode: !s.demoMode })),

      setView: (v) => set({ currentView: v }),

      getGroupStandings: (group) => {
        const { matches } = get()
        const teams = TEAMS.filter(t => t.group === group)
        const groupMatches = matches.filter(m => m.group === group)
        return computeStandings(teams, groupMatches)
      },

      getAllStandings: () => {
        const groups: GroupId[] = ['A','B','C','D','E','F','G','H','I','J','K','L']
        return Object.fromEntries(
          groups.map(g => [g, get().getGroupStandings(g)])
        ) as Record<GroupId, StandingRow[]>
      },

      getBestThirds: () => {
        const groups: GroupId[] = ['A','B','C','D','E','F','G','H','I','J','K','L']
        const thirds = groups.map(g => {
          const rows = get().getGroupStandings(g)
          return rows[2] ? { ...rows[2], group: g } : null
        }).filter(Boolean) as (StandingRow & { group: GroupId })[]
        return thirds.sort(compareBestThirds)
      },

      getMatchesForHome: () => {
        const { matches } = get()
        const today    = nowArgBucket()
        const tomorrow = tomorrowArgBucket()

        const live: Match[]     = []
        const todayM: Match[]   = []
        const tomorrowM: Match[] = []

        for (const m of matches) {
          const bucket = dateArgBucket(m.date)
          const status = effectiveStatus(m.status, m.date)
          // A suspended/postponed/cancelled match is not actively playing —
          // keep it out of "En curso" so it doesn't look stuck, show it under
          // its day instead.
          const interrupted = m.interruption === 'suspended' || m.interruption === 'postponed'
            || m.interruption === 'cancelled' || m.interruption === 'abandoned'
          if (status === 'live' && !interrupted) {
            live.push(m)
          } else if (status === 'finished' || interrupted) {
            if (bucket === today) todayM.push(m)
          } else { // scheduled
            if (bucket === today) todayM.push(m)
            else if (bucket === tomorrow) tomorrowM.push(m)
          }
        }

        todayM.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        tomorrowM.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        return { live, today: todayM, tomorrow: tomorrowM }
      },

      hasLiveMatches: () => {
        const { matches } = get()
        return matches.some(m =>
          !m.interruption && effectiveStatus(m.status, m.date) === 'live',
        )
      },

      getProvisionalStandings: (group) => {
        const { matches, demoMode } = get()
        const teams = TEAMS.filter(t => t.group === group)
        let groupMatches = matches.filter(m => m.group === group)
        if (demoMode) groupMatches = injectDemoLive(groupMatches)
        return computeProvisionalStandings(teams, groupMatches)
      },

      getProvisionalBestThirds: () => {
        const groups: GroupId[] = ['A','B','C','D','E','F','G','H','I','J','K','L']
        const thirds = groups.map(g => {
          const rows = get().getProvisionalStandings(g)
          return rows[2] ? { ...rows[2], group: g } : null
        }).filter(Boolean) as (StandingRow & { group: GroupId })[]
        return thirds.sort(compareBestThirds)
      },

      getGroupLiveMatches: (group) => {
        const { matches, demoMode } = get()
        if (demoMode) {
          const groupMatches = matches.filter(m => m.group === group)
          return injectDemoLive(groupMatches).filter(m => m.status === 'live')
        }
        return matches
          .filter(m => m.group === group && !m.interruption
            && effectiveStatus(m.status, m.date) === 'live')
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      },

      getLiveDefiningGroups: () => {
        const { matches, demoMode } = get()

        if (demoMode) return demoGroups(matches)

        const groups: GroupId[] = ['A','B','C','D','E','F','G','H','I','J','K','L']
        return groups.filter(g => {
          let live = 0, finished = 0
          for (const m of matches) {
            if (m.group !== g || m.interruption) continue
            const s = effectiveStatus(m.status, m.date)
            if (s === 'live') live++
            else if (s === 'finished') finished++
          }
          // Final matchday = the first 4 group games are done and at least one
          // of the last (simultaneous) pair is being played right now.
          return live >= 1 && finished >= 4
        })
      },

      refresh: async (full = false) => {
        set({ isRefreshing: true })
        try {
          const updates = await fetchLiveMatches(full)
          if (updates && updates.length > 0) {
            // ESPN ids differ from our seed ids, so match by the (unordered) team pair.
            const byPair = new Map<string, (typeof updates)[number]>()
            for (const u of updates) {
              byPair.set([u.homeId, u.awayId].sort().join('|'), u)
            }
            set(state => ({
              matches: state.matches.map(m => {
                const u = byPair.get([m.homeTeamId, m.awayTeamId].sort().join('|'))
                if (!u) return m
                // ESPN may report the fixture with home/away flipped vs our seed.
                const flipped = u.homeId !== m.homeTeamId
                const home = flipped ? u.awayScore : u.homeScore
                const away = flipped ? u.homeScore : u.awayScore
                return {
                  ...m,
                  homeScore:      home ?? m.homeScore,
                  awayScore:      away ?? m.awayScore,
                  minute:         u.minute ?? m.minute,
                  extraMinute:    u.extraMinute,
                  period:         u.period,
                  isHalftime:     u.isHalftime,
                  status:         u.status,
                  aet:            u.aet,
                  homePenalties:  flipped ? u.awayPenalties : u.homePenalties,
                  awayPenalties:  flipped ? u.homePenalties : u.awayPenalties,
                  scorers:        u.scorers.length > 0 ? u.scorers : (m.scorers ?? []),
                  cards:          u.cards.length   > 0 ? u.cards   : (m.cards   ?? []),
                  homePossession: flipped ? u.awayPossession : u.homePossession,
                  awayPossession: flipped ? u.homePossession : u.awayPossession,
                  attendance:     u.attendance ?? m.attendance,
                  referee:        u.referee    ?? m.referee,
                  // Accumulate max stoppage seen per period across refreshes
                  p1Stoppage: u.p1Stoppage != null
                    ? Math.max(u.p1Stoppage, m.p1Stoppage ?? 0)
                    : (m.p1Stoppage ?? null),
                  p2Stoppage: u.p2Stoppage != null
                    ? Math.max(u.p2Stoppage, m.p2Stoppage ?? 0)
                    : (m.p2Stoppage ?? null),
                  interruption: u.interruption,
                }
              }),
              lastRefresh: Date.now(),
            }))
          } else {
            set({ lastRefresh: Date.now() })
          }
        } finally {
          set({ isRefreshing: false })
        }
      },

      updateMatchScore: (id, homeScore, awayScore, status) => {
        set(state => ({
          matches: state.matches.map(m =>
            m.id === id ? { ...m, homeScore, awayScore, status } : m
          ),
        }))
      },
    }),
    {
      name: 'mundial-facil-v3',
      // demoMode intentionally excluded — always starts false on page load
      partialize: (s) => ({ matches: s.matches }),
    },
  ),
)
