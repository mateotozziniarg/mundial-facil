import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Match, StandingRow, GroupId } from '../types'
import { FIXTURES } from '../data/fixtures'
import { TEAMS } from '../data/teams'
import { computeStandings, computeProvisionalStandings, compareBestThirds } from '../lib/standings'
import { fetchLiveMatches, type LiveUpdate } from '../lib/api'
import { effectiveStatus } from '../lib/dateUtils'
import { stageForDate } from '../lib/knockoutBuild'

const pairKey = (a: string, b: string) => [a, b].sort().join('|')

/** Build a brand-new match from an ESPN event we had no seed for (knockout). */
function matchFromUpdate(u: LiveUpdate): Match {
  const id = Number(u.espnId)
  return {
    id: Number.isFinite(id) && id > 0 ? id : Math.abs(hashPair(u.homeId, u.awayId)),
    homeTeamId: u.homeId,
    awayTeamId: u.awayId,
    homeScore: u.homeScore,
    awayScore: u.awayScore,
    minute: u.minute,
    status: u.status,
    date: u.kickoff ?? new Date().toISOString(),
    venue: '', city: '',
    group: null,
    stage: stageForDate(u.kickoff),
    extraMinute: u.extraMinute,
    period: u.period,
    isHalftime: u.isHalftime,
    aet: u.aet,
    homePenalties: u.homePenalties,
    awayPenalties: u.awayPenalties,
    scorers: u.scorers,
    cards: u.cards,
    homePossession: u.homePossession,
    awayPossession: u.awayPossession,
    attendance: u.attendance,
    referee: u.referee,
    p1Stoppage: u.p1Stoppage,
    p2Stoppage: u.p2Stoppage,
    interruption: u.interruption,
  }
}

function hashPair(a: string, b: string): number {
  const s = pairKey(a, b)
  let h = 9_000_000
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}

type View = 'home' | 'groups' | 'brackets' | 'calculator' | 'calendar'

interface WorldCupState {
  matches: Match[]
  currentView: View
  lastRefresh: number | null
  isRefreshing: boolean

  // Derived (computed on demand)
  getGroupStandings: (group: GroupId) => StandingRow[]
  getAllStandings: () => Record<GroupId, StandingRow[]>
  getBestThirds: () => (StandingRow & { group: GroupId })[]
  getMatchesForHome: () => { live: Match[]; today: Match[]; tomorrow: Match[]; upcoming: Match[] }
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

export const useWorldCupStore = create<WorldCupState>()(
  persist(
    (set, get) => ({
      matches: FIXTURES,
      currentView: 'home',
      lastRefresh: null,
      isRefreshing: false,

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
        const now = Date.now()

        const live: Match[]      = []
        const todayM: Match[]    = []
        const tomorrowM: Match[] = []
        const upcoming: Match[]  = []

        for (const m of matches) {
          const bucket = dateArgBucket(m.date)
          const status = effectiveStatus(m.status, m.date)
          const interrupted = m.interruption === 'suspended' || m.interruption === 'postponed'
            || m.interruption === 'cancelled' || m.interruption === 'abandoned'
          if (status === 'live' && !interrupted) {
            live.push(m)
          } else if (status === 'finished' || interrupted) {
            if (bucket === today) todayM.push(m)
          } else { // scheduled
            if (bucket === today) todayM.push(m)
            else if (bucket === tomorrow) tomorrowM.push(m)
            else if (new Date(m.date).getTime() > now) upcoming.push(m)  // día siguiente en adelante
          }
        }

        const byDate = (a: Match, b: Match) => new Date(a.date).getTime() - new Date(b.date).getTime()
        todayM.sort(byDate)
        tomorrowM.sort(byDate)
        upcoming.sort(byDate)

        return { live, today: todayM, tomorrow: tomorrowM, upcoming: upcoming.slice(0, 16) }
      },

      hasLiveMatches: () => {
        const { matches } = get()
        return matches.some(m =>
          !m.interruption && effectiveStatus(m.status, m.date) === 'live',
        )
      },

      getProvisionalStandings: (group) => {
        const { matches } = get()
        const teams = TEAMS.filter(t => t.group === group)
        const groupMatches = matches.filter(m => m.group === group)
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
        const { matches } = get()
        return matches
          .filter(m => m.group === group && !m.interruption
            && effectiveStatus(m.status, m.date) === 'live')
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      },

      getLiveDefiningGroups: () => {
        const { matches } = get()
        const groups: GroupId[] = ['A','B','C','D','E','F','G','H','I','J','K','L']
        return groups.filter(g => {
          let live = 0, finished = 0
          for (const m of matches) {
            if (m.group !== g || m.interruption) continue
            const s = effectiveStatus(m.status, m.date)
            if (s === 'live') live++
            else if (s === 'finished') finished++
          }
          return live >= 1 && finished >= 4
        })
      },

      refresh: async (full = false) => {
        set({ isRefreshing: true })
        try {
          const updates = await fetchLiveMatches(full)
          if (updates && updates.length > 0) {
            const byPair = new Map<string, LiveUpdate>()
            for (const u of updates) byPair.set(pairKey(u.homeId, u.awayId), u)

            set(state => {
              // Pass 1: apply each update onto the matching existing fixture.
              const existingPairs = new Set(state.matches.map(m => pairKey(m.homeTeamId, m.awayTeamId)))
              const mapped = state.matches.map(m => {
                const u = byPair.get(pairKey(m.homeTeamId, m.awayTeamId))
                if (!u) return m
                const flipped = u.homeId !== m.homeTeamId
                const home = flipped ? u.awayScore : u.homeScore
                const away = flipped ? u.homeScore : u.awayScore
                return {
                  ...m,
                  // Correct a knockout match's kickoff with ESPN's real date
                  // (group dates are already correct, so leave them).
                  date:           m.stage !== 'group' && u.kickoff ? u.kickoff : m.date,
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
                  p1Stoppage: u.p1Stoppage != null
                    ? Math.max(u.p1Stoppage, m.p1Stoppage ?? 0)
                    : (m.p1Stoppage ?? null),
                  p2Stoppage: u.p2Stoppage != null
                    ? Math.max(u.p2Stoppage, m.p2Stoppage ?? 0)
                    : (m.p2Stoppage ?? null),
                  interruption: u.interruption,
                }
              })
              // Pass 2: ingest any ESPN event we had no fixture for (knockout
              // matches). ESPN is the source of truth — this is what makes a
              // live R32/R16/etc. show up even if our projection differs.
              const added = [...byPair.values()]
                .filter(u => !existingPairs.has(pairKey(u.homeId, u.awayId)))
                .map(matchFromUpdate)

              return { matches: added.length > 0 ? [...mapped, ...added] : mapped }
            })
            set({ lastRefresh: Date.now() })
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
      name: 'mundial-facil-v5',
      partialize: (s) => ({ matches: s.matches }),
    },
  ),
)
