const TZ = 'America/Argentina/Buenos_Aires'

export function toArgTime(isoDate: string): Date {
  return new Date(isoDate)
}

export function formatArgTime(isoDate: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(isoDate))
}

export function formatArgDate(isoDate: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(isoDate))
}

export function formatArgDateTime(isoDate: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(isoDate))
}

/** Stable 'YYYY-MM-DD' key for the Argentina calendar day of an instant. */
export function argDayKey(isoDate: string | number | Date): string {
  // en-CA yields ISO-style YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(isoDate))
}

/** Today's Argentina day key. */
export function argTodayKey(now: number = Date.now()): string {
  return argDayKey(now)
}

/** Pretty long label for a day key, e.g. "Martes 17 de junio". */
export function formatDayKeyLong(dayKey: string): string {
  const [y, m, d] = dayKey.split('-').map(Number)
  // noon UTC keeps the calendar date stable across TZ
  const date = new Date(Date.UTC(y, m - 1, d, 12))
  const s = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long',
  }).format(date)
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function isToday(isoDate: string): boolean {
  const d = new Intl.DateTimeFormat('es-AR', { timeZone: TZ, dateStyle: 'short' }).format(new Date(isoDate))
  const t = new Intl.DateTimeFormat('es-AR', { timeZone: TZ, dateStyle: 'short' }).format(new Date())
  return d === t
}

export function isTomorrow(isoDate: string): boolean {
  const tomorrow = new Date(Date.now() + 864e5)
  const d = new Intl.DateTimeFormat('es-AR', { timeZone: TZ, dateStyle: 'short' }).format(new Date(isoDate))
  const t = new Intl.DateTimeFormat('es-AR', { timeZone: TZ, dateStyle: 'short' }).format(tomorrow)
  return d === t
}

/** Human countdown: "Faltan 3 h 20 m", "Faltan 45 min", "Empieza pronto" */
export function countdownTo(isoDate: string, now: number = Date.now()): string {
  const diff = new Date(isoDate).getTime() - now
  if (diff <= 0) return 'Empezando'
  const totalMin = Math.floor(diff / 60000)
  const days = Math.floor(totalMin / 1440)
  const hours = Math.floor((totalMin % 1440) / 60)
  const mins = totalMin % 60

  if (days >= 1) return `En ${days} d ${hours} h`
  if (hours >= 1) return `Faltan ${hours} h ${mins.toString().padStart(2, '0')} m`
  if (totalMin >= 1) return `Faltan ${mins} min`
  return 'Empieza pronto'
}

/** Approximate live minute from kickoff (used when API gives no elapsed) */
export function elapsedMinutes(isoDate: string, now: number = Date.now()): number {
  const diff = now - new Date(isoDate).getTime()
  return Math.max(0, Math.floor(diff / 60000))
}

/** A match is "in progress" by the clock if kickoff passed but not +120min */
export function isLiveByClock(isoDate: string, now: number = Date.now()): boolean {
  const start = new Date(isoDate).getTime()
  return now >= start && now <= start + 120 * 60000
}

/**
 * Effective status derived from the clock, so the UI never shows a past match
 * as "upcoming" (the old "Empezando" bug). Explicit finished/live from the
 * seed or API always win.
 */
export type EffStatus = 'scheduled' | 'live' | 'finished'
const MATCH_WINDOW_MS = 115 * 60000  // ~90' + halftime + stoppage

export function effectiveStatus(
  rawStatus: 'scheduled' | 'live' | 'finished',
  isoDate: string,
  now: number = Date.now(),
): EffStatus {
  if (rawStatus === 'finished') return 'finished'
  if (rawStatus === 'live') return 'live'
  const start = new Date(isoDate).getTime()
  if (now < start) return 'scheduled'
  if (now <= start + MATCH_WINDOW_MS) return 'live'
  return 'finished'   // kicked off long ago without live data → treat as done
}

/** "hace 12 s" / "hace 3 min" */
export function timeAgo(ts: number, now: number = Date.now()): string {
  const sec = Math.max(0, Math.floor((now - ts) / 1000))
  if (sec < 60) return `hace ${sec} s`
  const min = Math.floor(sec / 60)
  if (min < 60) return `hace ${min} min`
  const hr = Math.floor(min / 60)
  return `hace ${hr} h`
}
