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
