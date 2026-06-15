import type { Match } from '../types'

// Real 2026 FIFA World Cup group-stage fixture.
// Kickoff times sourced in ET (US Eastern, EDT = UTC-4) and stored as UTC
// (UTC = ET + 4h). Displayed in Argentina time (UTC-3 = ET + 1h).
// Real results filled in for matches played up to Jun 15. Venues are
// best-effort host-city assignments.
const M = (
  id: number, homeTeamId: string, awayTeamId: string,
  date: string, venue: string, city: string, group: Match['group'],
  homeScore: number | null = null, awayScore: number | null = null,
  status: Match['status'] = 'scheduled',
): Match => ({ id, homeTeamId, awayTeamId, homeScore, awayScore, minute: null, status, date, venue, city, group, stage: 'group' })

export const FIXTURES: Match[] = [
  // ─── GROUP A ─── Mexico, South Africa, South Korea, Czechia
  M(1,  'MEX', 'RSA', '2026-06-11T19:00:00Z', 'Estadio Azteca',        'Ciudad de México', 'A', 2, 0, 'finished'),
  M(2,  'KOR', 'CZE', '2026-06-12T01:00:00Z', 'SoFi Stadium',          'Los Ángeles',      'A', 2, 1, 'finished'),
  M(3,  'CZE', 'RSA', '2026-06-18T16:00:00Z', 'Lincoln Financial Field','Filadelfia',      'A'),
  M(4,  'MEX', 'KOR', '2026-06-19T01:00:00Z', 'Estadio Akron',         'Guadalajara',      'A'),
  M(5,  'CZE', 'MEX', '2026-06-25T01:00:00Z', 'Estadio Azteca',        'Ciudad de México', 'A'),
  M(6,  'RSA', 'KOR', '2026-06-25T01:00:00Z', 'Estadio BBVA',          'Monterrey',        'A'),

  // ─── GROUP B ─── Canada, Bosnia-Herz., Qatar, Switzerland
  M(7,  'CAN', 'BIH', '2026-06-12T22:00:00Z', 'BMO Field',             'Toronto',          'B', 1, 1, 'finished'),
  M(8,  'QAT', 'SUI', '2026-06-13T19:00:00Z', 'MetLife Stadium',       'Nueva York/NJ',    'B', 1, 1, 'finished'),
  M(9,  'SUI', 'BIH', '2026-06-18T19:00:00Z', 'NRG Stadium',           'Houston',          'B'),
  M(10, 'CAN', 'QAT', '2026-06-18T22:00:00Z', 'BC Place',              'Vancouver',        'B'),
  M(11, 'SUI', 'CAN', '2026-06-24T19:00:00Z', 'BMO Field',             'Toronto',          'B'),
  M(12, 'BIH', 'QAT', '2026-06-24T19:00:00Z', 'BC Place',              'Vancouver',        'B'),

  // ─── GROUP C ─── Brazil, Morocco, Haiti, Scotland
  M(13, 'BRA', 'MAR', '2026-06-13T22:00:00Z', 'SoFi Stadium',          'Los Ángeles',      'C', 1, 1, 'finished'),
  M(14, 'SCO', 'HAI', '2026-06-14T01:00:00Z', 'AT&T Stadium',          'Dallas',           'C', 1, 0, 'finished'),
  M(15, 'SCO', 'MAR', '2026-06-18T22:00:00Z', 'Mercedes-Benz Stadium', 'Atlanta',          'C'),
  M(16, 'BRA', 'HAI', '2026-06-20T01:00:00Z', 'Hard Rock Stadium',     'Miami',            'C'),
  M(17, 'SCO', 'BRA', '2026-06-24T22:00:00Z', 'Hard Rock Stadium',     'Miami',            'C'),
  M(18, 'MAR', 'HAI', '2026-06-24T22:00:00Z', 'Mercedes-Benz Stadium', 'Atlanta',          'C'),

  // ─── GROUP D ─── USA, Paraguay, Türkiye, Australia
  M(19, 'USA', 'PAR', '2026-06-13T01:00:00Z', 'SoFi Stadium',          'Los Ángeles',      'D', 4, 1, 'finished'),
  M(20, 'AUS', 'TUR', '2026-06-13T16:00:00Z', 'Lumen Field',           'Seattle',          'D', 2, 0, 'finished'),
  M(21, 'USA', 'AUS', '2026-06-19T19:00:00Z', 'SoFi Stadium',          'Los Ángeles',      'D'),
  M(22, 'PAR', 'TUR', '2026-06-20T04:00:00Z', 'Arrowhead Stadium',     'Kansas City',      'D'),
  M(23, 'TUR', 'USA', '2026-06-26T02:00:00Z', 'AT&T Stadium',          'Dallas',           'D'),
  M(24, 'PAR', 'AUS', '2026-06-26T02:00:00Z', 'Levi\'s Stadium',       'San Francisco',    'D'),

  // ─── GROUP E ─── Germany, Ivory Coast, Ecuador, Curaçao
  M(25, 'GER', 'CUW', '2026-06-14T17:00:00Z', 'MetLife Stadium',       'Nueva York/NJ',    'E', 7, 1, 'finished'),
  M(26, 'CIV', 'ECU', '2026-06-14T23:00:00Z', 'Arrowhead Stadium',     'Kansas City',      'E', 1, 0, 'finished'),
  M(27, 'GER', 'CIV', '2026-06-20T20:00:00Z', 'MetLife Stadium',       'Nueva York/NJ',    'E'),
  M(28, 'ECU', 'CUW', '2026-06-21T00:00:00Z', 'Lincoln Financial Field','Filadelfia',      'E'),
  M(29, 'ECU', 'GER', '2026-06-25T20:00:00Z', 'Gillette Stadium',      'Boston',           'E'),
  M(30, 'CUW', 'CIV', '2026-06-25T20:00:00Z', 'Lincoln Financial Field','Filadelfia',      'E'),

  // ─── GROUP F ─── Netherlands, Japan, Sweden, Tunisia
  M(31, 'NED', 'JPN', '2026-06-14T20:00:00Z', 'Lumen Field',           'Seattle',          'F', 2, 2, 'finished'),
  M(32, 'SWE', 'TUN', '2026-06-15T02:00:00Z', 'Levi\'s Stadium',       'San Francisco',    'F', 5, 1, 'finished'),
  M(33, 'NED', 'SWE', '2026-06-20T17:00:00Z', 'BC Place',              'Vancouver',        'F'),
  M(34, 'TUN', 'JPN', '2026-06-21T04:00:00Z', 'Levi\'s Stadium',       'San Francisco',    'F'),
  M(35, 'JPN', 'SWE', '2026-06-25T23:00:00Z', 'Lumen Field',           'Seattle',          'F'),
  M(36, 'TUN', 'NED', '2026-06-25T23:00:00Z', 'BC Place',              'Vancouver',        'F'),

  // ─── GROUP G ─── Belgium, Egypt, Iran, New Zealand
  M(37, 'BEL', 'EGY', '2026-06-15T19:00:00Z', 'Lumen Field',           'Seattle',          'G'),
  M(38, 'IRN', 'NZL', '2026-06-16T01:00:00Z', 'Hard Rock Stadium',     'Miami',            'G'),
  M(39, 'BEL', 'IRN', '2026-06-21T19:00:00Z', 'Lincoln Financial Field','Filadelfia',      'G'),
  M(40, 'NZL', 'EGY', '2026-06-22T01:00:00Z', 'Hard Rock Stadium',     'Miami',            'G'),
  M(41, 'EGY', 'IRN', '2026-06-27T03:00:00Z', 'Mercedes-Benz Stadium', 'Atlanta',          'G'),
  M(42, 'NZL', 'BEL', '2026-06-27T03:00:00Z', 'NRG Stadium',           'Houston',          'G'),

  // ─── GROUP H ─── Spain, Uruguay, Saudi Arabia, Cape Verde
  M(43, 'ESP', 'CPV', '2026-06-15T16:00:00Z', 'AT&T Stadium',          'Dallas',           'H', 0, 0, 'finished'),
  M(44, 'KSA', 'URU', '2026-06-15T22:00:00Z', 'Hard Rock Stadium',     'Miami',            'H'),
  M(45, 'ESP', 'KSA', '2026-06-21T16:00:00Z', 'MetLife Stadium',       'Nueva York/NJ',    'H'),
  M(46, 'URU', 'CPV', '2026-06-21T22:00:00Z', 'AT&T Stadium',          'Dallas',           'H'),
  M(47, 'CPV', 'KSA', '2026-06-27T00:00:00Z', 'Gillette Stadium',      'Boston',           'H'),
  M(48, 'URU', 'ESP', '2026-06-27T00:00:00Z', 'Hard Rock Stadium',     'Miami',            'H'),

  // ─── GROUP I ─── France, Senegal, Norway, Iraq
  M(49, 'FRA', 'SEN', '2026-06-16T19:00:00Z', 'MetLife Stadium',       'Nueva York/NJ',    'I'),
  M(50, 'IRQ', 'NOR', '2026-06-16T22:00:00Z', 'Arrowhead Stadium',     'Kansas City',      'I'),
  M(51, 'FRA', 'IRQ', '2026-06-22T21:00:00Z', 'SoFi Stadium',          'Los Ángeles',      'I'),
  M(52, 'NOR', 'SEN', '2026-06-23T00:00:00Z', 'Gillette Stadium',      'Boston',           'I'),
  M(53, 'NOR', 'FRA', '2026-06-26T19:00:00Z', 'MetLife Stadium',       'Nueva York/NJ',    'I'),
  M(54, 'SEN', 'IRQ', '2026-06-26T19:00:00Z', 'Arrowhead Stadium',     'Kansas City',      'I'),

  // ─── GROUP J ─── Argentina, Austria, Jordan, Algeria
  M(55, 'ARG', 'ALG', '2026-06-17T01:00:00Z', 'MetLife Stadium',       'Nueva York/NJ',    'J'),
  M(56, 'AUT', 'JOR', '2026-06-17T04:00:00Z', 'SoFi Stadium',          'Los Ángeles',      'J'),
  M(57, 'ARG', 'AUT', '2026-06-22T17:00:00Z', 'Hard Rock Stadium',     'Miami',            'J'),
  M(58, 'JOR', 'ALG', '2026-06-23T03:00:00Z', 'Levi\'s Stadium',       'San Francisco',    'J'),
  M(59, 'JOR', 'ARG', '2026-06-28T02:00:00Z', 'Mercedes-Benz Stadium', 'Atlanta',          'J'),
  M(60, 'ALG', 'AUT', '2026-06-28T02:00:00Z', 'NRG Stadium',           'Houston',          'J'),

  // ─── GROUP K ─── Portugal, Colombia, Uzbekistan, DR Congo
  M(61, 'POR', 'COD', '2026-06-17T17:00:00Z', 'SoFi Stadium',          'Los Ángeles',      'K'),
  M(62, 'UZB', 'COL', '2026-06-18T02:00:00Z', 'AT&T Stadium',          'Dallas',           'K'),
  M(63, 'POR', 'UZB', '2026-06-23T17:00:00Z', 'Lumen Field',           'Seattle',          'K'),
  M(64, 'COL', 'COD', '2026-06-24T02:00:00Z', 'Hard Rock Stadium',     'Miami',            'K'),
  M(65, 'COL', 'POR', '2026-06-27T23:30:00Z', 'SoFi Stadium',          'Los Ángeles',      'K'),
  M(66, 'COD', 'UZB', '2026-06-27T23:30:00Z', 'Levi\'s Stadium',       'San Francisco',    'K'),

  // ─── GROUP L ─── England, Croatia, Ghana, Panama
  M(67, 'ENG', 'CRO', '2026-06-17T20:00:00Z', 'Gillette Stadium',      'Boston',           'L'),
  M(68, 'GHA', 'PAN', '2026-06-17T23:00:00Z', 'Arrowhead Stadium',     'Kansas City',      'L'),
  M(69, 'ENG', 'GHA', '2026-06-23T20:00:00Z', 'MetLife Stadium',       'Nueva York/NJ',    'L'),
  M(70, 'PAN', 'CRO', '2026-06-23T23:00:00Z', 'Lincoln Financial Field','Filadelfia',      'L'),
  M(71, 'PAN', 'ENG', '2026-06-27T21:00:00Z', 'Gillette Stadium',      'Boston',           'L'),
  M(72, 'CRO', 'GHA', '2026-06-27T21:00:00Z', 'Mercedes-Benz Stadium', 'Atlanta',          'L'),
]
