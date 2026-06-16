import type { MatchStatus, GoalEvent } from '../types'

const ESPN_BASE    = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard'
const ESPN_SUMMARY = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary'

export interface LiveUpdate {
  homeId: string
  awayId: string
  homeScore: number | null
  awayScore: number | null
  minute: number | null
  extraMinute: number | null
  period: number
  isHalftime: boolean
  status: MatchStatus
  aet: boolean
  homePenalties: number | null
  awayPenalties: number | null
  scorers: GoalEvent[]
}

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

function parseClockDisplay(
  displayClock: string | undefined,
  period: number,
): { minute: number; extra: number | null } {
  if (!displayClock) return { minute: 0, extra: null }
  const plusMatch = displayClock.match(/^(\d+)\+(\d+)/)
  if (plusMatch) return { minute: parseInt(plusMatch[1]), extra: parseInt(plusMatch[2]) }
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
  status: MatchStatus; isHalftime: boolean; aet: boolean; hasPenalties: boolean
} {
  const ht  = typeName.includes('HALFTIME')
  const fin = completed || state === 'post'
  const pen = fin && typeName.includes('PEN')
  const aet = fin && (pen || typeName.includes('AET') || typeName.includes('OT_') || typeName.includes('OVERTIME'))
  return {
    status: fin ? 'finished' : (ht || state === 'in') ? 'live' : 'scheduled',
    isHalftime: ht, aet, hasPenalties: pen,
  }
}

// — ESPN types —
interface EspnTeam      { displayName?: string; name?: string; location?: string; shortDisplayName?: string }
interface EspnLinescore { period?: { type?: string; number?: number }; value?: number }
interface EspnCompetitor {
  homeAway: 'home' | 'away'
  score?: string
  team: EspnTeam
  linescores?: EspnLinescore[]
}
interface EspnStatus {
  clock?: number; displayClock?: string; period?: number
  type: { name: string; state: string; completed: boolean }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyArr = any[]
interface EspnCompetition {
  competitors: EspnCompetitor[]
  status: EspnStatus
  // Scorer data sometimes lives in the scoreboard response itself:
  scoringPlays?: AnyArr
  keyEvents?: AnyArr
  details?: AnyArr
}
interface EspnEvent {
  id?: string
  competitions?: EspnCompetition[]
}
interface EspnScoringPlay {
  scoringPlay?: boolean
  penaltyKick?: boolean
  ownGoal?: boolean
  clock?: { displayValue?: string }
  period?: { number?: number } | number
  team?: { displayName?: string; name?: string }
  participants?: { athlete?: { displayName?: string } }[]
  athletesInvolved?: { displayName?: string }[]
  type?: { id?: string; text?: string }
  text?: string
}

function periodNumber(p: EspnScoringPlay['period']): number {
  if (!p) return 1
  if (typeof p === 'number') return p
  return p.number ?? 1
}

function playerFromPlay(play: EspnScoringPlay): string {
  const name =
    play.participants?.[0]?.athlete?.displayName ??
    play.athletesInvolved?.[0]?.displayName
  if (name) return name
  if (play.text) {
    const m = play.text.match(/\(([^)]+)\)/)
    if (m) return m[1].trim()
  }
  return '?'
}

function isGoalPlay(p: EspnScoringPlay): boolean {
  if (p.scoringPlay === true) return true
  const typeText = (p.type?.text ?? '').toLowerCase()
  // ESPN type id 57 = Goal; also catch "Own Goal", "Penalty" variants
  return ['goal', 'own goal', 'penalty'].some(t => typeText.includes(t))
}

function parsePlays(plays: EspnScoringPlay[]): GoalEvent[] {
  const goals: GoalEvent[] = []
  for (const play of plays) {
    const teamId = NAME_TO_ID[normalize(play.team?.displayName ?? play.team?.name ?? '')]
    if (!teamId) continue
    const period = periodNumber(play.period)
    const { minute, extra } = parseClockDisplay(play.clock?.displayValue, period)
    goals.push({
      teamId,
      playerName:  playerFromPlay(play),
      minute,
      extraMinute: extra,
      isPenalty:   play.penaltyKick ?? false,
      isOwnGoal:   play.ownGoal ?? false,
    })
  }
  return goals.sort((a, b) => a.minute - b.minute || (a.extraMinute ?? 0) - (b.extraMinute ?? 0))
}

/** Try to extract goal events from ANY array ESPN may provide. */
function extractGoals(arr: AnyArr | undefined): GoalEvent[] {
  if (!Array.isArray(arr) || arr.length === 0) return []
  // If the array is exclusively scoring plays (scoringPlays key), parse all.
  // If it's a mixed array (details/keyEvents), filter to goals first.
  const plays = arr.filter(isGoalPlay)
  // If filtering produced nothing but the array has items, try without filter
  // (in case the scoringPlays array has no explicit scoringPlay:true flag)
  return parsePlays(plays.length > 0 ? plays : arr)
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

/**
 * Fetch scoring plays from the ESPN summary endpoint.
 * ESPN uses several different response shapes for different leagues/seasons —
 * we try every known path and return the first non-empty result.
 */
async function fetchScoringPlays(eventId: string): Promise<{ goals: GoalEvent[]; raw: object }> {
  const empty = { goals: [] as GoalEvent[], raw: {} }
  try {
    const res = await fetch(`${ESPN_SUMMARY}?event=${eventId}`)
    if (!res.ok) return empty
    const json = await res.json()

    // Collect all top-level keys for debug visibility
    const topKeys = Object.keys(json)

    // Try every known path (order: most specific first)
    const candidates: [string, AnyArr | undefined][] = [
      ['json.scoringPlays',                   json.scoringPlays],
      ['json.keyEvents',                       json.keyEvents],
      ['json.competitions[0].scoringPlays',    json.competitions?.[0]?.scoringPlays],
      ['json.competitions[0].keyEvents',       json.competitions?.[0]?.keyEvents],
      ['json.competitions[0].details',         json.competitions?.[0]?.details],
      ['json.plays',                           json.plays],
    ]

    for (const [, arr] of candidates) {
      const goals = extractGoals(arr)
      if (goals.length > 0) {
        return { goals, raw: { topKeys, foundIn: candidates.find(c => c[1] === arr)?.[0], count: goals.length } }
      }
    }

    return { goals: [], raw: { topKeys, foundIn: 'none', allEmpty: true } }
  } catch (e) {
    return { goals: [], raw: { error: String(e) } }
  }
}

/** Write debug info to localStorage for the ?debug=1 panel. */
function saveDebug(info: object) {
  try {
    localStorage.setItem('__espn_debug', JSON.stringify(info, null, 2))
  } catch { /* ignore */ }
}

/** Fetch live / recent World Cup data from ESPN. */
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

    // Build pending summary fetches for live/finished events
    const summaryByEventId = new Map<string, Promise<{ goals: GoalEvent[]; raw: object }>>()
    for (const ev of events) {
      if (!ev.id) continue
      const state = ev.competitions?.[0]?.status?.type?.state
      if (state === 'in' || state === 'post') {
        summaryByEventId.set(ev.id, fetchScoringPlays(ev.id))
      }
    }

    // Resolve all summaries concurrently
    const summaryResults = new Map<string, { goals: GoalEvent[]; raw: object }>()
    await Promise.all(
      [...summaryByEventId.entries()].map(async ([id, p]) => {
        summaryResults.set(id, await p)
      }),
    )

    const updates: LiveUpdate[] = []
    const debugEvents: object[] = []

    for (const ev of events) {
      const comp = ev.competitions?.[0]
      if (!comp) continue

      const homeComp = comp.competitors.find(c => c.homeAway === 'home')
      const awayComp = comp.competitors.find(c => c.homeAway === 'away')
      if (!homeComp || !awayComp) continue

      const homeId = resolveId(homeComp.team as Record<string, string | undefined>)
      const awayId = resolveId(awayComp.team as Record<string, string | undefined>)
      if (!homeId || !awayId) continue

      const st       = comp.status
      const typeName = st.type.name
      const period   = st.period ?? 1

      const { status, isHalftime, aet, hasPenalties } = parseEspnStatus(typeName, st.type.state, st.type.completed)
      const { minute, extra } = isHalftime ? { minute: 45, extra: null } : parseClockDisplay(st.displayClock, period)

      let homePenalties: number | null = null
      let awayPenalties: number | null = null
      if (hasPenalties) {
        const isPen = (l: EspnLinescore) => l.period?.type === 'shootout' || (l.period?.number ?? 0) >= 5
        homePenalties = homeComp.linescores?.find(isPen)?.value ?? null
        awayPenalties = awayComp.linescores?.find(isPen)?.value ?? null
      }

      // 1. Try scorers from the scoreboard competition data itself
      let scorers = extractGoals(comp.scoringPlays ?? comp.keyEvents ?? comp.details)

      // 2. Fall back to summary endpoint data
      const summaryData = summaryResults.get(ev.id ?? '')
      if (scorers.length === 0 && summaryData) {
        scorers = summaryData.goals
      }

      debugEvents.push({
        id: ev.id,
        match: `${homeId} vs ${awayId}`,
        status: typeName,
        sbScoringPlays: comp.scoringPlays?.length ?? 'absent',
        sbKeyEvents:    comp.keyEvents?.length    ?? 'absent',
        sbDetails:      comp.details?.length      ?? 'absent',
        summary:        summaryData?.raw ?? 'not fetched',
        scorersFound:   scorers.length,
      })

      updates.push({
        homeId, awayId,
        homeScore: homeComp.score !== '' ? Number(homeComp.score) : null,
        awayScore: awayComp.score !== '' ? Number(awayComp.score) : null,
        minute: isHalftime ? 45 : (minute || null),
        extraMinute: extra,
        period, isHalftime, status, aet,
        homePenalties, awayPenalties,
        scorers,
      })
    }

    saveDebug({ ts: new Date().toISOString(), events: debugEvents })
    return updates.length > 0 ? updates : null
  } catch { return null }
}
