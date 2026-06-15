import type { MatchStatus, GoalEvent } from '../types'

/**
 * Live data from ESPN's free, public, no-key scoreboard + summary APIs.
 * CORS-enabled — works directly from the browser. No API key needed.
 */
const ESPN_BASE    = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard'
const ESPN_SUMMARY = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary'

export interface LiveUpdate {
  homeId: string
  awayId: string
  homeScore: number | null
  awayScore: number | null
  minute: number | null
  extraMinute: number | null
  period: number              // 1=1st half, 2=2nd half, 3=ET1, 4=ET2
  isHalftime: boolean
  status: MatchStatus
  aet: boolean
  homePenalties: number | null
  awayPenalties: number | null
  scorers: GoalEvent[]
}

// ESPN English name (normalised) → our internal team id
const NAME_TO_ID: Record<string, string> = {
  'mexico': 'MEX', 'south africa': 'RSA',
  'south korea': 'KOR', 'korea republic': 'KOR', 'korea': 'KOR',
  'czechia': 'CZE', 'czech republic': 'CZE',
  'canada': 'CAN', 'bosnia and herzegovina': 'BIH', 'bosnia & herzegovina': 'BIH', 'bosnia': 'BIH',
  'qatar': 'QAT', 'switzerland': 'SUI',
  'brazil': 'BRA', 'morocco': 'MAR', 'haiti': 'HAI', 'scotland': 'SCO',
  'united states': 'USA', 'usa': 'USA', 'paraguay': 'PAR',
  'turkey': 'TUR', 'turkiye': 'TUR', 'australia': 'AUS',
  'germany': 'GER', "ivory coast": 'CIV', "cote d'ivoire": 'CIV', 'ecuador': 'ECU', 'curacao': 'CUW',
  'netherlands': 'NED', 'japan': 'JPN', 'sweden': 'SWE', 'tunisia': 'TUN',
  'belgium': 'BEL', 'egypt': 'EGY', 'iran': 'IRN', 'ir iran': 'IRN', 'new zealand': 'NZL',
  'spain': 'ESP', 'uruguay': 'URU', 'saudi arabia': 'KSA', 'cape verde': 'CPV', 'cabo verde': 'CPV',
  'france': 'FRA', 'senegal': 'SEN', 'norway': 'NOR', 'iraq': 'IRQ',
  'argentina': 'ARG', 'austria': 'AUT', 'jordan': 'JOR', 'algeria': 'ALG',
  'portugal': 'POR', 'colombia': 'COL', 'uzbekistan': 'UZB',
  'dr congo': 'COD', 'congo dr': 'COD', 'democratic republic of the congo': 'COD',
  'england': 'ENG', 'croatia': 'CRO', 'ghana': 'GHA', 'panama': 'PAN',
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

function resolveId(team: Record<string, string | undefined>): string | null {
  for (const key of ['displayName', 'name', 'location', 'shortDisplayName']) {
    const val = team[key]
    if (!val) continue
    const id = NAME_TO_ID[normalize(val)]
    if (id) return id
  }
  return null
}

/**
 * ESPN gives displayClock as "MM:SS" (e.g. "47:30") counting up.
 * We convert to { minute, extra } where extra is stoppage time.
 * Also handles "45+2" format that some endpoints use.
 */
function parseClockDisplay(
  displayClock: string | undefined,
  period: number,
): { minute: number; extra: number | null } {
  if (!displayClock) return { minute: 0, extra: null }

  // "45+2" explicit stoppage format
  const plusMatch = displayClock.match(/^(\d+)\+(\d+)/)
  if (plusMatch) return { minute: parseInt(plusMatch[1]), extra: parseInt(plusMatch[2]) }

  // "MM:SS" format — take only the minutes
  const colonMatch = displayClock.match(/^(\d+):(\d+)/)
  if (colonMatch) {
    const mins = parseInt(colonMatch[1])
    const cap = period === 1 ? 45 : period === 2 ? 90 : period === 3 ? 105 : 120
    if (mins > cap) return { minute: cap, extra: mins - cap }
    return { minute: mins, extra: null }
  }

  const n = parseInt(displayClock)
  return isNaN(n) ? { minute: 0, extra: null } : { minute: n, extra: null }
}

function parseEspnStatus(typeName: string, state: string, completed: boolean): {
  status: MatchStatus
  isHalftime: boolean
  aet: boolean
  hasPenalties: boolean
} {
  const ht  = typeName.includes('HALFTIME')
  const fin = completed || state === 'post'
  const pen = fin && typeName.includes('PEN')
  const aet = fin && (pen || typeName.includes('AET') || typeName.includes('OT_') || typeName.includes('OVERTIME'))

  return {
    status:       fin ? 'finished' : (ht || state === 'in') ? 'live' : 'scheduled',
    isHalftime:   ht,
    aet,
    hasPenalties: pen,
  }
}

// — ESPN API shapes (minimal) —
interface EspnTeam     { displayName?: string; name?: string; location?: string; shortDisplayName?: string }
interface EspnLinescore { period?: { type?: string; number?: number }; value?: number }
interface EspnCompetitor {
  homeAway: 'home' | 'away'
  score?: string
  team: EspnTeam
  linescores?: EspnLinescore[]
}
interface EspnStatus {
  clock?: number
  displayClock?: string
  period?: number
  type: { name: string; state: string; completed: boolean }
}
interface EspnEvent {
  id?: string
  competitions?: { competitors: EspnCompetitor[]; status: EspnStatus }[]
}
interface EspnScoringPlay {
  scoringPlay?: boolean
  penaltyKick?: boolean
  ownGoal?: boolean
  clock?: { displayValue?: string }
  period?: { number?: number }
  team?: { displayName?: string; name?: string }
  participants?: { athlete?: { displayName?: string } }[]
  athletesInvolved?: { displayName?: string }[]
}

function yyyymmdd(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

async function fetchScoreboard(dates: string): Promise<EspnEvent[]> {
  try {
    const res = await fetch(`${ESPN_BASE}?dates=${dates}`)
    if (!res.ok) return []
    const json = await res.json()
    return (json.events ?? []) as EspnEvent[]
  } catch { return [] }
}

/** Fetch goal-scorer data from the ESPN summary (play-by-play) endpoint. */
async function fetchScoringPlays(eventId: string): Promise<GoalEvent[]> {
  try {
    const res = await fetch(`${ESPN_SUMMARY}?event=${eventId}`)
    if (!res.ok) return []
    const json = await res.json()

    const plays: EspnScoringPlay[] = (
      json.scoringPlays ??
      json.competitions?.[0]?.scoringPlays ??
      (json.plays as EspnScoringPlay[] | undefined)?.filter(p => p.scoringPlay) ??
      []
    )

    const goals: GoalEvent[] = []
    for (const play of plays) {
      if (!play.scoringPlay) continue
      const teamId = NAME_TO_ID[normalize(play.team?.displayName ?? play.team?.name ?? '')]
      if (!teamId) continue

      const period = play.period?.number ?? 1
      const { minute, extra } = parseClockDisplay(play.clock?.displayValue, period)
      const playerName =
        play.participants?.[0]?.athlete?.displayName ??
        play.athletesInvolved?.[0]?.displayName ??
        '?'

      goals.push({
        teamId,
        playerName,
        minute,
        extraMinute: extra,
        isPenalty:  play.penaltyKick ?? false,
        isOwnGoal:  play.ownGoal ?? false,
      })
    }

    return goals.sort((a, b) =>
      a.minute - b.minute || (a.extraMinute ?? 0) - (b.extraMinute ?? 0),
    )
  } catch { return [] }
}

/** Fetch live / recent World Cup data from ESPN — no API key required. */
export async function fetchLiveMatches(): Promise<LiveUpdate[] | null> {
  try {
    const now = Date.now()
    const dates = [
      yyyymmdd(new Date(now - 864e5)),
      yyyymmdd(new Date(now)),
      yyyymmdd(new Date(now + 864e5)),
    ]

    const eventsArr = await Promise.all(dates.map(fetchScoreboard))
    const events    = eventsArr.flat()
    if (events.length === 0) return null

    // For live and finished matches, fetch scoring plays in parallel
    const summaryPromises = new Map<string, Promise<GoalEvent[]>>()
    for (const ev of events) {
      if (!ev.id) continue
      const state = ev.competitions?.[0]?.status?.type?.state
      if (state === 'in' || state === 'post') {
        summaryPromises.set(ev.id, fetchScoringPlays(ev.id))
      }
    }
    const scorersByEvent = new Map<string, GoalEvent[]>()
    await Promise.all(
      [...summaryPromises.entries()].map(async ([id, p]) => {
        scorersByEvent.set(id, await p)
      }),
    )

    const updates: LiveUpdate[] = []

    for (const ev of events) {
      const comp = ev.competitions?.[0]
      if (!comp) continue

      const homeComp = comp.competitors.find(c => c.homeAway === 'home')
      const awayComp = comp.competitors.find(c => c.homeAway === 'away')
      if (!homeComp || !awayComp) continue

      const homeId = resolveId(homeComp.team as Record<string, string | undefined>)
      const awayId = resolveId(awayComp.team as Record<string, string | undefined>)
      if (!homeId || !awayId) continue

      const st      = comp.status
      const typeName = st.type.name
      const period   = st.period ?? 1

      const { status, isHalftime, aet, hasPenalties } = parseEspnStatus(
        typeName, st.type.state, st.type.completed,
      )

      const { minute, extra } = isHalftime
        ? { minute: 45, extra: null }
        : parseClockDisplay(st.displayClock, period)

      // Penalty-shootout scores live in linescores period type "shootout" or period 5
      let homePenalties: number | null = null
      let awayPenalties: number | null = null
      if (hasPenalties) {
        const isPen = (l: EspnLinescore) =>
          l.period?.type === 'shootout' || (l.period?.number ?? 0) >= 5
        homePenalties = homeComp.linescores?.find(isPen)?.value ?? null
        awayPenalties = awayComp.linescores?.find(isPen)?.value ?? null
      }

      const scorers = scorersByEvent.get(ev.id ?? '') ?? []

      updates.push({
        homeId,
        awayId,
        homeScore: homeComp.score !== '' ? Number(homeComp.score) : null,
        awayScore: awayComp.score !== '' ? Number(awayComp.score) : null,
        minute:        isHalftime ? 45 : (minute || null),
        extraMinute:   extra,
        period,
        isHalftime,
        status,
        aet,
        homePenalties,
        awayPenalties,
        scorers,
      })
    }

    return updates.length > 0 ? updates : null
  } catch { return null }
}
