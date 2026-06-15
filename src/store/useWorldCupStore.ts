import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Match, StandingRow, GroupId } from '../types'
import { FIXTURES } from '../data/fixtures'
import { TEAMS } from '../data/teams'
import { computeStandings, compareBestThirds } from '../lib/standings'
import { fetchLiveMatches } from '../lib/api'
import { effectiveStatus } from '../lib/dateUtils'

type View = 'home' | 'groups' | 'brackets' | 'calculator'

interface WorldCupState {
  matches: Match[]
  currentView: View
  lastRefresh: number | null
  isRefreshing: boolean

  // Derived (computed on demand)
  getGroupStandings: (group: GroupId) => StandingRow[]
  getAllStandings: () => Record<GroupId, StandingRow[]>
  getBestThirds: () => (StandingRow & { group: GroupId })[]
  getMatchesForHome: () => { live: Match[]; today: Match[]; tomorrow: Match[] }
  hasLiveMatches: () => boolean

  // Actions
  setView: (v: View) => void
  refresh: () => Promise<void>
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
        return computeStandings(teams, groupMatches, group)
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
          if (status === 'live') {
            live.push(m)
          } else if (status === 'finished') {
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
        return matches.some(m => effectiveStatus(m.status, m.date) === 'live')
      },

      refresh: async () => {
        set({ isRefreshing: true })
        try {
          const updates = await fetchLiveMatches()
          if (updates) {
            set(state => ({
              matches: state.matches.map(m => {
                const u = updates.find(u => u.id === m.id)
                if (!u) return m
                return {
                  ...m,
                  homeScore: u.homeScore ?? m.homeScore,
                  awayScore: u.awayScore ?? m.awayScore,
                  minute:    u.minute ?? m.minute,
                  status:    u.status ?? m.status,
                }
              }),
              lastRefresh: Date.now(),
            }))
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
      partialize: (s) => ({ matches: s.matches }),
    },
  ),
)
