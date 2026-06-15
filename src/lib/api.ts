import type { MatchStatus } from '../types'

/**
 * Live data from ESPN's free, public, no-key scoreboard API.
 * CORS-enabled, works directly from the browser. No API key needed.
 * Returns live scores + match minute for the FIFA World Cup.
 */
const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard'

/** A live update matched to our fixtures by the team pair (ESPN ids differ from ours). */
export interface LiveUpdate {
  homeId: string
  awayId: string
  homeScore: number | null
  awayScore: number | null
  minute: number | null
  status: MatchStatus
}

// ESPN English country name (normalized) -> our internal team id
const NAME_TO_ID: Record<string, string> = {
  'mexico': 'MEX', 'south africa': 'RSA', 'south korea': 'KOR', 'korea republic': 'KOR', 'korea': 'KOR',
  'czechia': 'CZE', 'czech republic': 'CZE',
  'canada': 'CAN', 'bosnia and herzegovina': 'BIH', 'bosnia & herzegovina': 'BIH', 'bosnia': 'BIH',
  'qatar': 'QAT', 'switzerland': 'SUI',
  'brazil': 'BRA', 'morocco': 'MAR', 'haiti': 'HAI', 'scotland': 'SCO',
  'united states': 'USA', 'usa': 'USA', 'paraguay': 'PAR', 'turkey': 'TUR', 'turkiye': 'TUR', 'australia': 'AUS',
  'germany': 'GER', 'ivory coast': 'CIV', "cote d'ivoire": 'CIV', 'ecuador': 'ECU', 'curacao': 'CUW',
  'netherlands': 'NED', 'japan': 'JPN', 'sweden': 'SWE', 'tunisia': 'TUN',
  'belgium': 'BEL', 'egypt': 'EGY', 'iran': 'IRN', 'ir iran': 'IRN', 'new zealand': 'NZL',
  'spain': 'ESP', 'uruguay': 'URU', 'saudi arabia': 'KSA', 'cape verde': 'CPV', 'cabo verde': 'CPV',
  'france': 'FRA', 'senegal': 'SEN', 'norway': 'NOR', 'iraq': 'IRQ',
  'argentina': 'ARG', 'austria': 'AUT', 'jordan': 'JOR', 'algeria': 'ALG',
  'portugal': 'POR', 'colombia': 'COL', 'uzbekistan': 'UZB', 'dr congo': 'COD', 'congo dr': 'COD',
  'democratic republic of the congo': 'COD',
  'england': 'ENG', 'croatia': 'CRO', 'ghana': 'GHA', 'panama': 'PAN',
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

/** Resolve an ESPN competitor to our internal team id, trying several fields. */
function resolveTeamId(team: { displayName?: string; name?: string; location?: string; shortDisplayName?: string }): string | null {
  for (const candidate of [team.displayName, team.name, team.location, team.shortDisplayName]) {
    if (!candidate) continue
    const id = NAME_TO_ID[normalize(candidate)]
    if (id) return id
  }
  return null
}

function mapStatus(state: string, completed: boolean): MatchStatus {
  if (completed || state === 'post') return 'finished'
  if (state === 'in') return 'live'
  return 'scheduled'
}

interface EspnCompetitor {
  homeAway: 'home' | 'away'
  score: string
  team: { displayName?: string; name?: string; location?: string; shortDisplayName?: string }
}
interface EspnEvent {
  competitions: {
    competitors: EspnCompetitor[]
    status: { clock?: number; displayClock?: string; type: { state: string; completed: boolean } }
  }[]
}

function yyyymmdd(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

async function fetchDate(dates: string): Promise<EspnEvent[]> {
  const res = await fetch(`${ESPN_BASE}?dates=${dates}`)
  if (!res.ok) return []
  const json = await res.json()
  return (json.events ?? []) as EspnEvent[]
}

/** Fetch live/recent fixtures from ESPN; returns updates keyed by team pair. */
export async function fetchLiveMatches(): Promise<LiveUpdate[] | null> {
  try {
    // Cover yesterday→tomorrow (UTC) so we catch every in-progress and just-finished match.
    const now = Date.now()
    const dateRange = [
      yyyymmdd(new Date(now - 864e5)),
      yyyymmdd(new Date(now)),
      yyyymmdd(new Date(now + 864e5)),
    ]
    const batches = await Promise.all(dateRange.map(fetchDate))
    const events = batches.flat()
    if (events.length === 0) return null

    const updates: LiveUpdate[] = []
    for (const ev of events) {
      const comp = ev.competitions?.[0]
      if (!comp) continue
      const home = comp.competitors.find(c => c.homeAway === 'home')
      const away = comp.competitors.find(c => c.homeAway === 'away')
      if (!home || !away) continue

      const homeId = resolveTeamId(home.team)
      const awayId = resolveTeamId(away.team)
      if (!homeId || !awayId) continue

      const st = comp.status
      const status = mapStatus(st.type.state, st.type.completed)
      const minute = status === 'live'
        ? parseInt(st.displayClock?.replace(/\D/g, '') || '') || (st.clock ? Math.round(st.clock) : null)
        : null

      updates.push({
        homeId,
        awayId,
        homeScore: home.score !== '' ? Number(home.score) : null,
        awayScore: away.score !== '' ? Number(away.score) : null,
        minute,
        status,
      })
    }
    return updates
  } catch {
    return null
  }
}
