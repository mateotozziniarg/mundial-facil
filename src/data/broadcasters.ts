// Broadcast info for Argentina viewers.
// Disney/ESPN holds all FIFA 2026 rights in LATAM.
// Argentina national team matches also air on free-to-air TV by law.

export interface Broadcaster {
  id: string
  name: string
  url: string
  color: string  // text
  bg: string     // background
  free: boolean
}

export const B = {
  disney: {
    id: 'disney',
    name: 'Disney+',
    url: 'https://www.disneyplus.com/es-ar',
    color: '#648fe0',
    bg: 'color-mix(in srgb, #648fe0 14%, transparent)',
    free: false,
  } satisfies Broadcaster,

  tvPublica: {
    id: 'tvpublica',
    name: 'TV Pública',
    url: 'https://www.tvpublica.com.ar/en-vivo',
    color: '#22c55e',
    bg: 'color-mix(in srgb, #22c55e 13%, transparent)',
    free: true,
  } satisfies Broadcaster,

  telefe: {
    id: 'telefe',
    name: 'Telefé',
    url: 'https://mitelefe.com/vivos',
    color: '#ef4444',
    bg: 'color-mix(in srgb, #ef4444 13%, transparent)',
    free: true,
  } satisfies Broadcaster,
}

// Match IDs → broadcasters for Argentine viewers.
// All matches on Disney+. Select matches also on free TV.
// (Argentina national team games must air on free TV — Ley 26.522)
const OVERRIDE: Record<number, Broadcaster[]> = {
  // Group J — Argentina
  55: [B.disney, B.tvPublica],   // ARG vs ALG
  57: [B.disney, B.tvPublica],   // ARG vs AUT
  59: [B.disney, B.tvPublica],   // JOR vs ARG
}

export function getBroadcastersAR(matchId: number): Broadcaster[] {
  return OVERRIDE[matchId] ?? [B.disney]
}
