import { useEffect, useMemo, useState } from 'react'
import { useWorldCupStore } from '../../store/useWorldCupStore'
import { MatchCard } from '../home/MatchCard'
import { argDayKey, argTodayKey, formatDayKeyLong, effectiveStatus } from '../../lib/dateUtils'
import type { Match } from '../../types'

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// JS getUTCDay: 0=Sun..6=Sat → index into Mon-first week (Mon=0..Sun=6)
function mondayIdx(utcDay: number): number {
  return (utcDay + 6) % 7
}

function dayKeyParts(key: string): { y: number; m: number; d: number } {
  const [y, m, d] = key.split('-').map(Number)
  return { y, m, d }
}

function weekdayOf(key: string): number {
  const { y, m, d } = dayKeyParts(key)
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()
}

export function CalendarView() {
  const { matches } = useWorldCupStore()
  const today = argTodayKey()

  // 1s tick so MatchCard countdowns / live minutes stay current
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // Bucket matches by Argentina day
  const byDay = useMemo(() => {
    const map = new Map<string, Match[]>()
    for (const m of matches) {
      const key = argDayKey(m.date)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(m)
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    }
    return map
  }, [matches])

  const allDays = useMemo(() => [...byDay.keys()].sort(), [byDay])
  const firstDay = allDays[0]
  const lastDay  = allDays[allDays.length - 1]

  // Range selection: start always set; end null = single day
  const [start, setStart] = useState<string>(() => (byDay.has(today) ? today : allDays[0] ?? today))
  const [end, setEnd] = useState<string | null>(null)

  function pickDay(key: string) {
    if (end !== null || start === null) {
      // start a fresh selection
      setStart(key); setEnd(null)
      return
    }
    // start set, end null → extend or restart
    if (key === start) return
    if (key > start) setEnd(key)
    else { setStart(key); setEnd(null) }
  }

  function inSelection(key: string): boolean {
    if (end === null) return key === start
    return key >= start && key <= end
  }

  // Build the month grids spanning firstDay..lastDay
  const monthGrids = useMemo(() => buildMonths(firstDay, lastDay), [firstDay, lastDay])

  // Matches in the current selection, grouped by day
  const selectedDays = useMemo(() => {
    if (!start) return []
    const lo = start
    const hi = end ?? start
    return allDays.filter(d => d >= lo && d <= hi)
  }, [allDays, start, end])

  const totalSelected = selectedDays.reduce((s, d) => s + (byDay.get(d)?.length ?? 0), 0)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Calendario</h1>
        <p className="text-sm text-ink-3 mt-1">
          Elegí un día para ver sus partidos. Tocá un segundo día para armar un rango.
        </p>
      </div>

      {/* Quick chips */}
      <div className="flex flex-wrap gap-2">
        {byDay.has(today) && (
          <QuickChip label="Hoy" active={start === today && end === null} onClick={() => { setStart(today); setEnd(null) }} />
        )}
        <QuickChip
          label="Todo el torneo"
          active={start === firstDay && end === lastDay}
          onClick={() => { setStart(firstDay); setEnd(lastDay) }}
        />
        {end !== null && (
          <button
            onClick={() => setEnd(null)}
            className="chip chip-soon cursor-pointer"
            title="Volver a un solo día"
          >
            ✕ rango
          </button>
        )}
      </div>

      {/* Calendar */}
      <div className="panel p-4 sm:p-5 space-y-6">
        {monthGrids.map(({ year, month, cells }) => (
          <div key={`${year}-${month}`}>
            <div className="text-sm font-bold text-white mb-3">
              {MONTHS[month]} <span className="text-ink-3 font-normal">{year}</span>
            </div>
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {WEEKDAYS.map(w => (
                <div key={w} className="text-center text-[10px] font-semibold text-ink-3 uppercase tracking-wide pb-1">
                  {w}
                </div>
              ))}
              {cells.map((cell, i) => {
                if (!cell) return <div key={i} />
                const dayMatches = byDay.get(cell) ?? []
                const count = dayMatches.length
                const liveCount = dayMatches.filter(m => effectiveStatus(m.status, m.date, now) === 'live').length
                const { d } = dayKeyParts(cell)
                const selected = inSelection(cell)
                const isStart = cell === start
                const isEnd = cell === end
                const isToday_ = cell === today
                const isEdge = isStart || isEnd
                return (
                  <button
                    key={i}
                    onClick={() => count > 0 && pickDay(cell)}
                    disabled={count === 0}
                    className={[
                      'relative aspect-square rounded-lg flex flex-col items-center justify-center transition-all',
                      count === 0 ? 'opacity-30 cursor-default' : 'cursor-pointer',
                      selected
                        ? (isEdge ? 'bg-[var(--color-grass)] text-[var(--color-base)]' : 'bg-[var(--color-grass)]/25 text-white')
                        : count > 0 ? 'bg-[var(--color-surface)] hover:bg-[var(--color-raised)] text-ink' : 'text-ink-3',
                      isToday_ && !isEdge ? 'ring-1 ring-[var(--color-gold)]' : '',
                    ].join(' ')}
                  >
                    <span className={`text-[13px] font-semibold nums ${isEdge ? '' : ''}`}>{d}</span>
                    {count > 0 && (
                      <span className={[
                        'mt-0.5 text-[9px] font-bold leading-none px-1 py-0.5 rounded-full nums',
                        isEdge ? 'bg-[var(--color-base)]/25' : selected ? 'bg-[var(--color-grass)]/30 text-[var(--color-grass)]' : 'bg-white/[0.06] text-ink-2',
                      ].join(' ')}>
                        {count}
                      </span>
                    )}
                    {liveCount > 0 && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[var(--color-live)] live-dot" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Selected matches */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="w-1 h-5 rounded-full bg-[var(--color-grass)]" />
          <h2 className="text-lg font-bold text-white">
            {end === null
              ? formatDayKeyLong(start)
              : `${formatDayKeyLong(start)} → ${formatDayKeyLong(end)}`}
          </h2>
          <span className="text-xs text-ink-3 nums">{totalSelected} {totalSelected === 1 ? 'partido' : 'partidos'}</span>
          <div className="flex-1 h-px hairline border-t" />
        </div>

        {selectedDays.length === 0 && (
          <p className="text-center py-10 text-ink-3 text-sm">No hay partidos en esta selección.</p>
        )}

        {selectedDays.map(dayKey => (
          <div key={dayKey} className="space-y-3">
            {end !== null && (
              <h3 className="text-[13px] font-semibold text-ink-2 pt-1">{formatDayKeyLong(dayKey)}</h3>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(byDay.get(dayKey) ?? []).map((m, i) => (
                <MatchCard key={m.id} match={m} now={now} style={{ animationDelay: `${i * 30}ms` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function QuickChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={[
        'text-xs font-medium px-3 py-1.5 rounded-full border transition-colors cursor-pointer',
        active
          ? 'border-[var(--color-grass)] text-[var(--color-grass)] bg-[var(--color-grass)]/10'
          : 'border-[var(--color-line-2)] text-ink-2 hover:text-ink hover:border-ink-3',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

// Build month grids (Mon-first) spanning the given inclusive day-key range.
function buildMonths(firstKey: string | undefined, lastKey: string | undefined) {
  if (!firstKey || !lastKey) return []
  const first = dayKeyParts(firstKey)
  const last = dayKeyParts(lastKey)
  const months: { year: number; month: number; cells: (string | null)[] }[] = []

  let y = first.y, m = first.m - 1  // 0-based month
  while (y < last.y || (y === last.y && m <= last.m - 1)) {
    const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
    const firstKeyOfMonth = `${y}-${String(m + 1).padStart(2, '0')}-01`
    const lead = mondayIdx(weekdayOf(firstKeyOfMonth))
    const cells: (string | null)[] = Array(lead).fill(null)
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(`${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
    }
    months.push({ year: y, month: m, cells })
    m++
    if (m > 11) { m = 0; y++ }
  }
  return months
}
