import type { MatchStatus, GoalEvent, CardEvent, Interruption } from '../types'
import { FIXTURES } from '../data/fixtures'

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
  cards: CardEvent[]
  homePossession: number | null
  awayPossession: number | null
  attendance: number | null
  referee: string | null
  // Stoppage minutes for the current period at time of fetch (null if not in stoppage)
  p1Stoppage: number | null
  p2Stoppage: number | null
  interruption: Interruption | null
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

function parseClockDisplay(displayClock: string | undefined, period: number): { minute: number; extra: number | null } {
  if (!displayClock) return { minute: 0, extra: null }
  const s = displayClock.trim()
  const plusMatch = s.replace(/'/g, '').match(/^(\d+)\+(\d+)/)
  if (plusMatch) return { minute: parseInt(plusMatch[1]), extra: parseInt(plusMatch[2]) }
  const colonMatch = s.match(/^(\d+):(\d+)/)
  if (colonMatch) {
    const mins = parseInt(colonMatch[1])
    const cap = period === 1 ? 45 : period === 2 ? 90 : period === 3 ? 105 : 120
    if (mins > cap) return { minute: cap, extra: mins - cap }
    return { minute: mins, extra: null }
  }
  const n = parseInt(s)
  return isNaN(n) ? { minute: 0, extra: null } : { minute: n, extra: null }
}

function detectInterruption(typeName: string, detail: string): Interruption | null {
  const s = `${typeName} ${detail}`.toUpperCase()
  if (s.includes('SUSPEND'))                 return 'suspended'
  if (s.includes('POSTPON'))                 return 'postponed'
  if (s.includes('CANCEL'))                  return 'cancelled'
  if (s.includes('ABANDON') || s.includes('FORFEIT')) return 'abandoned'
  if (s.includes('DELAY') || s.includes('RAIN'))      return 'delayed'
  return null
}

function parseEspnStatus(typeName: string, state: string, completed: boolean, detail = ''): {
  status: MatchStatus; isHalftime: boolean; aet: boolean; hasPenalties: boolean
  interruption: Interruption | null
} {
  const interruption = detectInterruption(typeName, detail)
  const ht  = typeName.includes('HALFTIME')
  const fin = completed || state === 'post'
  const pen = fin && typeName.includes('PEN')
  const aet = fin && (pen || typeName.includes('AET') || typeName.includes('OT_') || typeName.includes('OVERTIME'))

  // Cancelled / abandoned won't resume → treat as finished (score frozen).
  // Postponed will be replayed → treat as scheduled.
  // Suspended / delayed: keep last known score but flag it so the UI stops
  //   showing a ticking live minute.
  let status: MatchStatus
  if (interruption === 'cancelled' || interruption === 'abandoned') status = 'finished'
  else if (interruption === 'postponed')                           status = 'scheduled'
  else if (interruption === 'suspended' || interruption === 'delayed') status = 'live'
  else status = fin ? 'finished' : (ht || state === 'in') ? 'live' : 'scheduled'

  return { status, isHalftime: ht && !interruption, aet, hasPenalties: pen, interruption }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyArr = any[]

interface EspnTeam      { displayName?: string; name?: string; location?: string; shortDisplayName?: string }
interface EspnLinescore { period?: { type?: string; number?: number }; value?: number }
interface EspnCompetitor {
  homeAway: 'home' | 'away'; score?: string; team: EspnTeam; linescores?: EspnLinescore[]
}
interface EspnStatus {
  clock?: number; displayClock?: string; period?: number
  type: { name: string; state: string; completed: boolean; detail?: string; description?: string }
}
interface EspnCompetition {
  competitors: EspnCompetitor[]; status: EspnStatus
  scoringPlays?: AnyArr; keyEvents?: AnyArr; details?: AnyArr
}
interface EspnEvent { id?: string; competitions?: EspnCompetition[] }
interface EspnKeyEvent {
  scoringPlay?: boolean
  penaltyKick?: boolean; ownGoal?: boolean
  clock?: { displayValue?: string }
  period?: { number?: number } | number
  team?: { displayName?: string; name?: string }
  participants?: { athlete?: { displayName?: string }; type?: string }[]
  athletesInvolved?: { displayName?: string }[]
  type?: { id?: string; text?: string }
  text?: string
}

function periodNumber(p: EspnKeyEvent['period']): number {
  if (!p) return 1
  if (typeof p === 'number') return p
  return p.number ?? 1
}

function playerFromEvent(e: EspnKeyEvent): string {
  // participants[0] with type "scorer" or first participant, then athletesInvolved
  const name =
    e.participants?.find(p => p.type === 'scorer')?.athlete?.displayName ??
    e.participants?.[0]?.athlete?.displayName ??
    e.athletesInvolved?.[0]?.displayName
  if (name) return name
  if (e.text) {
    const m = e.text.match(/\(([^)]+)\)/)
    if (m) return m[1].trim()
  }
  return '?'
}

function eventTypeText(e: EspnKeyEvent): string {
  return (e.type?.text ?? '').toLowerCase().trim()
}

function isGoalEvent(e: EspnKeyEvent): boolean {
  if (e.scoringPlay === true)  return true
  if (e.scoringPlay === false) return false
  const t = eventTypeText(e)
  return t.startsWith('goal') || t === 'own goal'
}

function isCardEvent(e: EspnKeyEvent): boolean {
  const t = eventTypeText(e)
  return t.includes('yellow card') || t.includes('red card')
}

function isRedCard(e: EspnKeyEvent): boolean {
  const t = eventTypeText(e)
  return t.includes('red card') || t.includes('second yellow')
}

interface MatchSummaryData {
  goals: GoalEvent[]
  cards: CardEvent[]
  homePossession: number | null
  awayPossession: number | null
  attendance: number | null
  referee: string | null
  raw: object
}

function parseKeyEvents(arr: AnyArr, homeId: string): { goals: GoalEvent[]; cards: CardEvent[] } {
  const goals: GoalEvent[] = []
  const cards: CardEvent[] = []

  for (const e of arr as EspnKeyEvent[]) {
    const teamId = NAME_TO_ID[normalize(e.team?.displayName ?? e.team?.name ?? '')]
    if (!teamId) continue
    const period = periodNumber(e.period)
    const { minute, extra } = parseClockDisplay(e.clock?.displayValue, period)
    const playerName = playerFromEvent(e)

    if (isGoalEvent(e)) {
      const t = eventTypeText(e)
      goals.push({
        teamId, playerName, minute, extraMinute: extra,
        isPenalty:  e.penaltyKick === true || t.includes('penalty'),
        isOwnGoal:  e.ownGoal    === true || t.includes('own goal'),
      })
    } else if (isCardEvent(e)) {
      cards.push({ teamId, playerName, minute, extraMinute: extra, isRed: isRedCard(e) })
    }
  }

  const byMin = (a: { minute: number; extraMinute?: number | null }, b: typeof a) =>
    a.minute - b.minute || (a.extraMinute ?? 0) - (b.extraMinute ?? 0)

  // For the 0-0 fallback: ensure we didn't accidentally treat non-goals as goals
  // Only include goal events where the scoring team actually matches a known team.
  // (Already guaranteed by the teamId check above.)

  void homeId  // homeId reserved for future possession pairing
  return { goals: goals.sort(byMin), cards: cards.sort(byMin) }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractPossession(boxscore: any, homeId: string, awayId: string): { home: number | null; away: number | null } {
  const teams: AnyArr = boxscore?.teams ?? []
  const result: Record<string, number> = {}
  for (const t of teams) {
    const id = resolveId(t.team ?? {})
    if (!id) continue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const poss = t.statistics?.find((s: any) =>
      s.name === 'possessionPct' || (s.label ?? '').toLowerCase().includes('possession'),
    )?.displayValue
    if (poss) result[id] = parseFloat(poss)
  }
  return { home: result[homeId] ?? null, away: result[awayId] ?? null }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractGameInfo(gameInfo: any): { attendance: number | null; referee: string | null } {
  const attendance: number | null = gameInfo?.attendance ?? null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ref = gameInfo?.officials?.find((o: any) =>
    (o.position?.displayName ?? '').toLowerCase().includes('referee'),
  )?.displayName ?? null
  return { attendance, referee: ref }
}

function yyyymmdd(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

/**
 * All distinct ESPN scoreboard days we need to cover up to `tomorrow`.
 * Derived from the fixture list so every already-played match-day gets
 * backfilled (ESPN's window is otherwise just yesterday/today/tomorrow).
 * Includes the day-before each fixture to absorb ET/UTC date boundaries.
 */
function backfillDates(now: number): string[] {
  const tomorrowMax = now + 864e5
  const set = new Set<string>()
  for (const m of FIXTURES) {
    const t = new Date(m.date).getTime()
    if (t > tomorrowMax + 864e5) continue   // skip far-future days
    set.add(yyyymmdd(new Date(t)))
    set.add(yyyymmdd(new Date(t - 864e5)))   // ET/UTC boundary safety
  }
  // Always include the live window explicitly
  set.add(yyyymmdd(new Date(now - 864e5)))
  set.add(yyyymmdd(new Date(now)))
  set.add(yyyymmdd(new Date(tomorrowMax)))
  return [...set].sort()
}

async function fetchScoreboard(dates: string): Promise<EspnEvent[]> {
  try {
    const res = await fetch(`${ESPN_BASE}?dates=${dates}`)
    if (!res.ok) return []
    const json = await res.json()
    return (json.events ?? []) as EspnEvent[]
  } catch { return [] }
}

async function fetchMatchSummary(eventId: string, homeId: string, awayId: string): Promise<MatchSummaryData> {
  const empty: MatchSummaryData = {
    goals: [], cards: [], homePossession: null, awayPossession: null,
    attendance: null, referee: null, raw: {},
  }
  try {
    const res = await fetch(`${ESPN_SUMMARY}?event=${eventId}`)
    if (!res.ok) return empty
    const json = await res.json()
    const topKeys = Object.keys(json)

    // Find the keyEvents / scoring array — try every known path
    const candidates: AnyArr[] = [
      json.keyEvents,
      json.scoringPlays,
      json.competitions?.[0]?.keyEvents,
      json.competitions?.[0]?.scoringPlays,
      json.competitions?.[0]?.details,
      json.plays,
    ].filter(a => Array.isArray(a) && a.length > 0)

    let goals: GoalEvent[] = []
    let cards: CardEvent[] = []
    let foundIn = 'none'

    for (const arr of candidates) {
      const result = parseKeyEvents(arr, homeId)
      // Use this candidate if it found goals OR if no previous candidate found goals
      // (we still want cards even from a no-goal match)
      if (result.goals.length > 0 || result.cards.length > 0) {
        goals = result.goals
        cards = result.cards
        foundIn = topKeys.join(',').includes('keyEvents') ? 'keyEvents' : 'other'
        break
      }
    }

    const { home: homePossession, away: awayPossession } = extractPossession(json.boxscore, homeId, awayId)
    const { attendance, referee } = extractGameInfo(json.gameInfo)

    return {
      goals, cards, homePossession, awayPossession, attendance, referee,
      raw: { topKeys, foundIn, goalsFound: goals.length, cardsFound: cards.length },
    }
  } catch (e) {
    return { ...empty, raw: { error: String(e) } }
  }
}

function saveDebug(info: object) {
  try { localStorage.setItem('__espn_debug', JSON.stringify(info, null, 2)) } catch { /* ignore */ }
}

/**
 * @param full  when true, fetch every played match-day (backfill all results);
 *              when false, only the live window (yesterday/today/tomorrow).
 */
export async function fetchLiveMatches(full = false): Promise<LiveUpdate[] | null> {
  try {
    const now = Date.now()
    const dates = full
      ? backfillDates(now)
      : [
          yyyymmdd(new Date(now - 864e5)),
          yyyymmdd(new Date(now)),
          yyyymmdd(new Date(now + 864e5)),
        ]

    const eventsArr = await Promise.all(dates.map(fetchScoreboard))
    // Dedup events by id (date ranges can overlap on ET/UTC boundaries)
    const seen = new Set<string>()
    const events = eventsArr.flat().filter(ev => {
      if (!ev.id || seen.has(ev.id)) return false
      seen.add(ev.id)
      return true
    })
    if (events.length === 0) return null

    // Kick off summary fetches for live/finished events
    const summaryMap = new Map<string, Promise<MatchSummaryData>>()

    // We need homeId/awayId to pass into fetchMatchSummary for possession matching.
    // Quick-resolve them here.
    const idCache = new Map<string, { homeId: string; awayId: string }>()
    for (const ev of events) {
      if (!ev.id) continue
      const comp = ev.competitions?.[0]
      if (!comp) continue
      const homeComp = comp.competitors.find(c => c.homeAway === 'home')
      const awayComp = comp.competitors.find(c => c.homeAway === 'away')
      if (!homeComp || !awayComp) continue
      const homeId = resolveId(homeComp.team as Record<string, string | undefined>)
      const awayId = resolveId(awayComp.team as Record<string, string | undefined>)
      if (!homeId || !awayId) continue
      idCache.set(ev.id, { homeId, awayId })
      const state = comp.status?.type?.state
      if (state === 'in' || state === 'post') {
        summaryMap.set(ev.id, fetchMatchSummary(ev.id, homeId, awayId))
      }
    }

    const summaryResults = new Map<string, MatchSummaryData>()
    await Promise.all(
      [...summaryMap.entries()].map(async ([id, p]) => { summaryResults.set(id, await p) }),
    )

    const updates: LiveUpdate[] = []
    const debugEvents: object[] = []

    for (const ev of events) {
      const comp = ev.competitions?.[0]
      if (!comp) continue
      const ids = idCache.get(ev.id ?? '')
      if (!ids) continue
      const { homeId, awayId } = ids

      const homeComp = comp.competitors.find(c => c.homeAway === 'home')!
      const awayComp = comp.competitors.find(c => c.homeAway === 'away')!

      const st       = comp.status
      const typeName = st.type.name
      const period   = st.period ?? 1

      const detail = st.type.detail ?? st.type.description ?? ''
      const { status, isHalftime, aet, hasPenalties, interruption } =
        parseEspnStatus(typeName, st.type.state, st.type.completed, detail)
      const { minute, extra } = isHalftime ? { minute: 45, extra: null } : parseClockDisplay(st.displayClock, period)

      let homePenalties: number | null = null
      let awayPenalties: number | null = null
      if (hasPenalties) {
        const isPen = (l: EspnLinescore) => l.period?.type === 'shootout' || (l.period?.number ?? 0) >= 5
        homePenalties = homeComp.linescores?.find(isPen)?.value ?? null
        awayPenalties = awayComp.linescores?.find(isPen)?.value ?? null
      }

      // Try scoreboard competition data first; fall back to summary
      const sbArr = comp.scoringPlays ?? comp.keyEvents ?? comp.details
      const sbParsed = sbArr ? parseKeyEvents(sbArr as AnyArr, homeId) : { goals: [], cards: [] }
      const summary  = summaryResults.get(ev.id ?? '')

      const scorers = sbParsed.goals.length > 0 ? sbParsed.goals : (summary?.goals ?? [])
      const cards   = sbParsed.cards.length > 0 ? sbParsed.cards : (summary?.cards ?? [])

      debugEvents.push({
        id: ev.id, match: `${homeId} vs ${awayId}`, status: typeName,
        detail, interruption,
        goalsFound: scorers.length, cardsFound: cards.length,
        possession: { home: summary?.homePossession, away: summary?.awayPossession },
        summary: summary?.raw ?? 'not fetched',
      })

      // Capture stoppage per period: if we're currently in stoppage of P1 or P2,
      // record the extra minutes so the store can accumulate the max seen.
      const p1Stoppage = (!isHalftime && period === 1 && extra != null) ? extra : null
      const p2Stoppage = (!isHalftime && period === 2 && extra != null) ? extra : null

      updates.push({
        homeId, awayId,
        homeScore: homeComp.score !== '' ? Number(homeComp.score) : null,
        awayScore: awayComp.score !== '' ? Number(awayComp.score) : null,
        minute: isHalftime ? 45 : (minute || null),
        extraMinute: extra, period, isHalftime, status, aet,
        homePenalties, awayPenalties,
        scorers, cards,
        homePossession: summary?.homePossession ?? null,
        awayPossession: summary?.awayPossession ?? null,
        attendance:     summary?.attendance     ?? null,
        referee:        summary?.referee        ?? null,
        p1Stoppage, p2Stoppage,
        interruption,
      })
    }

    saveDebug({ ts: new Date().toISOString(), events: debugEvents })
    return updates.length > 0 ? updates : null
  } catch { return null }
}
