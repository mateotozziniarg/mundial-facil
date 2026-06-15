import type { Team } from '../types'

export const TEAMS: Team[] = [
  // Group A
  { id: 'MEX', name: 'México',          flag: '🇲🇽', code: 'mx',     group: 'A' },
  { id: 'RSA', name: 'Sudáfrica',       flag: '🇿🇦', code: 'za',     group: 'A' },
  { id: 'KOR', name: 'Corea del Sur',   flag: '🇰🇷', code: 'kr',     group: 'A', shortName: 'Corea' },
  { id: 'CZE', name: 'Chequia',         flag: '🇨🇿', code: 'cz',     group: 'A' },
  // Group B
  { id: 'CAN', name: 'Canadá',          flag: '🇨🇦', code: 'ca',     group: 'B' },
  { id: 'BIH', name: 'Bosnia y Herz.',  flag: '🇧🇦', code: 'ba',     group: 'B', shortName: 'Bosnia' },
  { id: 'QAT', name: 'Catar',           flag: '🇶🇦', code: 'qa',     group: 'B' },
  { id: 'SUI', name: 'Suiza',           flag: '🇨🇭', code: 'ch',     group: 'B' },
  // Group C
  { id: 'BRA', name: 'Brasil',          flag: '🇧🇷', code: 'br',     group: 'C' },
  { id: 'MAR', name: 'Marruecos',       flag: '🇲🇦', code: 'ma',     group: 'C' },
  { id: 'HAI', name: 'Haití',           flag: '🇭🇹', code: 'ht',     group: 'C' },
  { id: 'SCO', name: 'Escocia',         flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', code: 'gb-sct', group: 'C' },
  // Group D
  { id: 'USA', name: 'Estados Unidos',  flag: '🇺🇸', code: 'us',     group: 'D', shortName: 'EE.UU.' },
  { id: 'PAR', name: 'Paraguay',        flag: '🇵🇾', code: 'py',     group: 'D' },
  { id: 'TUR', name: 'Turquía',         flag: '🇹🇷', code: 'tr',     group: 'D' },
  { id: 'AUS', name: 'Australia',       flag: '🇦🇺', code: 'au',     group: 'D' },
  // Group E
  { id: 'GER', name: 'Alemania',        flag: '🇩🇪', code: 'de',     group: 'E' },
  { id: 'CIV', name: 'Costa de Marfil', flag: '🇨🇮', code: 'ci',     group: 'E', shortName: 'C. Marfil' },
  { id: 'ECU', name: 'Ecuador',         flag: '🇪🇨', code: 'ec',     group: 'E' },
  { id: 'CUW', name: 'Curazao',         flag: '🇨🇼', code: 'cw',     group: 'E' },
  // Group F
  { id: 'NED', name: 'Países Bajos',    flag: '🇳🇱', code: 'nl',     group: 'F', shortName: 'P. Bajos' },
  { id: 'JPN', name: 'Japón',           flag: '🇯🇵', code: 'jp',     group: 'F' },
  { id: 'SWE', name: 'Suecia',          flag: '🇸🇪', code: 'se',     group: 'F' },
  { id: 'TUN', name: 'Túnez',           flag: '🇹🇳', code: 'tn',     group: 'F' },
  // Group G
  { id: 'BEL', name: 'Bélgica',         flag: '🇧🇪', code: 'be',     group: 'G' },
  { id: 'EGY', name: 'Egipto',          flag: '🇪🇬', code: 'eg',     group: 'G' },
  { id: 'IRN', name: 'Irán',            flag: '🇮🇷', code: 'ir',     group: 'G' },
  { id: 'NZL', name: 'Nueva Zelanda',   flag: '🇳🇿', code: 'nz',     group: 'G', shortName: 'N. Zelanda' },
  // Group H
  { id: 'ESP', name: 'España',          flag: '🇪🇸', code: 'es',     group: 'H' },
  { id: 'URU', name: 'Uruguay',         flag: '🇺🇾', code: 'uy',     group: 'H' },
  { id: 'KSA', name: 'Arabia Saudita',  flag: '🇸🇦', code: 'sa',     group: 'H', shortName: 'Arabia S.' },
  { id: 'CPV', name: 'Cabo Verde',      flag: '🇨🇻', code: 'cv',     group: 'H' },
  // Group I
  { id: 'FRA', name: 'Francia',         flag: '🇫🇷', code: 'fr',     group: 'I' },
  { id: 'SEN', name: 'Senegal',         flag: '🇸🇳', code: 'sn',     group: 'I' },
  { id: 'NOR', name: 'Noruega',         flag: '🇳🇴', code: 'no',     group: 'I' },
  { id: 'IRQ', name: 'Irak',            flag: '🇮🇶', code: 'iq',     group: 'I' },
  // Group J
  { id: 'ARG', name: 'Argentina',       flag: '🇦🇷', code: 'ar',     group: 'J' },
  { id: 'AUT', name: 'Austria',         flag: '🇦🇹', code: 'at',     group: 'J' },
  { id: 'JOR', name: 'Jordania',        flag: '🇯🇴', code: 'jo',     group: 'J' },
  { id: 'ALG', name: 'Argelia',         flag: '🇩🇿', code: 'dz',     group: 'J' },
  // Group K
  { id: 'POR', name: 'Portugal',        flag: '🇵🇹', code: 'pt',     group: 'K' },
  { id: 'COL', name: 'Colombia',        flag: '🇨🇴', code: 'co',     group: 'K' },
  { id: 'UZB', name: 'Uzbekistán',      flag: '🇺🇿', code: 'uz',     group: 'K' },
  { id: 'COD', name: 'Congo RD',        flag: '🇨🇩', code: 'cd',     group: 'K' },
  // Group L
  { id: 'ENG', name: 'Inglaterra',      flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', code: 'gb-eng', group: 'L' },
  { id: 'CRO', name: 'Croacia',         flag: '🇭🇷', code: 'hr',     group: 'L' },
  { id: 'GHA', name: 'Ghana',           flag: '🇬🇭', code: 'gh',     group: 'L' },
  { id: 'PAN', name: 'Panamá',          flag: '🇵🇦', code: 'pa',     group: 'L' },
]

export const TEAM_MAP = new Map(TEAMS.map(t => [t.id, t]))

export const TEAMS_BY_GROUP = TEAMS.reduce((acc, t) => {
  if (!acc[t.group]) acc[t.group] = []
  acc[t.group].push(t)
  return acc
}, {} as Record<string, Team[]>)

export const ARGENTINA_ID = 'ARG'
export const isArgentina = (id: string | undefined) => id === ARGENTINA_ID
