import type { Match, MatchStatus } from '../types'

const API_KEY  = import.meta.env.VITE_FOOTBALL_API_KEY  as string | undefined
const BASE_URL = 'https://v3.football.api-sports.io'
// FIFA World Cup 2026 competition ID on API-Football
const COMPETITION_ID = 1

interface ApiFixture {
  fixture: { id: number; date: string; status: { short: string; elapsed: number | null } }
  league:  { round: string }
  teams:   { home: { id: number; name: string }; away: { id: number; name: string } }
  goals:   { home: number | null; away: number | null }
  venue:   { name: string; city: string }
}

function mapStatus(short: string): MatchStatus {
  if (['FT', 'AET', 'PEN', 'AWD'].includes(short)) return 'finished'
  if (['1H', '2H', 'ET', 'P', 'HT', 'LIVE'].includes(short)) return 'live'
  return 'scheduled'
}

/** Fetch today's and tomorrow's fixtures from API-Football */
export async function fetchLiveMatches(): Promise<Partial<Match>[] | null> {
  if (!API_KEY) return null
  try {
    const today    = new Date().toISOString().slice(0, 10)
    const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10)
    const res = await fetch(
      `${BASE_URL}/fixtures?league=${COMPETITION_ID}&season=2026&from=${today}&to=${tomorrow}`,
      { headers: { 'x-apisports-key': API_KEY } },
    )
    if (!res.ok) return null
    const json = await res.json()
    return (json.response as ApiFixture[]).map(f => ({
      id: f.fixture.id,
      homeScore: f.goals.home,
      awayScore: f.goals.away,
      minute: f.fixture.status.elapsed,
      status: mapStatus(f.fixture.status.short),
    }))
  } catch {
    return null
  }
}
