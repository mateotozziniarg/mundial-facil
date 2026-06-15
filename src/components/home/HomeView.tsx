import { useEffect, useRef } from 'react'
import { useWorldCupStore } from '../../store/useWorldCupStore'
import { MatchCard } from './MatchCard'

const LIVE_INTERVAL = 30_000 // 30s

export function HomeView() {
  const { getMatchesForHome, refresh } = useWorldCupStore()
  const { live, today, tomorrow } = getMatchesForHome()
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (live.length > 0) {
      timerRef.current = setInterval(refresh, LIVE_INTERVAL)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [live.length, refresh])

  const hasContent = live.length > 0 || today.length > 0 || tomorrow.length > 0

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      {/* Hero */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-white tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          FIFA World Cup 2026
        </h1>
        <p className="text-slate-500 text-sm">11 Jun – 19 Jul · Canadá · México · Estados Unidos</p>
      </div>

      {!hasContent && (
        <div className="text-center py-20 text-slate-600">
          <div className="text-5xl mb-4">📅</div>
          <p>No hay partidos para hoy ni mañana.</p>
        </div>
      )}

      {/* Live */}
      {live.length > 0 && (
        <Section
          title="En curso"
          badge={<LiveBadge count={live.length} />}
        >
          <MatchGrid matches={live} />
        </Section>
      )}

      {/* Today */}
      {today.length > 0 && (
        <Section title="Hoy">
          <MatchGrid matches={today} />
        </Section>
      )}

      {/* Tomorrow */}
      {tomorrow.length > 0 && (
        <Section title="Mañana">
          <MatchGrid matches={tomorrow} />
        </Section>
      )}

      {/* Quick stats */}
      <QuickStats />
    </div>
  )
}

function Section({ title, badge, children }: { title: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {title}
        </h2>
        {badge}
        <div className="flex-1 h-px bg-[#1e2d45]" />
      </div>
      {children}
    </section>
  )
}

function MatchGrid({ matches }: { matches: import('../../types').Match[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {matches.map((m, i) => (
        <MatchCard
          key={m.id}
          match={m}
          style={{ animationDelay: `${i * 40}ms` }}
        />
      ))}
    </div>
  )
}

function LiveBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400 live-pulse inline-block" />
      {count} EN VIVO
    </span>
  )
}

function QuickStats() {
  const { matches } = useWorldCupStore()
  const finished  = matches.filter(m => m.status === 'finished').length
  const scheduled = matches.filter(m => m.status === 'scheduled').length
  const goals     = matches.reduce((sum, m) =>
    sum + (m.homeScore ?? 0) + (m.awayScore ?? 0), 0)

  const stats = [
    { label: 'Partidos jugados', value: finished, icon: '✅' },
    { label: 'Por jugar',        value: scheduled, icon: '📅' },
    { label: 'Goles totales',    value: goals,     icon: '⚽' },
    { label: 'Promedio goles',   value: finished > 0 ? (goals / finished).toFixed(1) : '–', icon: '📈' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map(s => (
        <div key={s.label} className="card2 p-4 text-center space-y-1">
          <div className="text-2xl">{s.icon}</div>
          <div className="text-2xl font-bold text-white">{s.value}</div>
          <div className="text-xs text-slate-500">{s.label}</div>
        </div>
      ))}
    </div>
  )
}
