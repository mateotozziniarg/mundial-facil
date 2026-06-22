import { useEffect, useRef, useState } from 'react'
import { useWorldCupStore } from '../../store/useWorldCupStore'
import { MatchCard } from './MatchCard'

const API_POLL = 45_000   // hit the live API every 45s when matches are live

export function HomeView() {
  const { getMatchesForHome, refresh, hasLiveMatches, lastRefresh } = useWorldCupStore()
  const { live, today, tomorrow } = getMatchesForHome()
  const live_ = hasLiveMatches()

  // 1s tick drives countdowns & live minutes
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // On mount: full refresh to backfill every already-played match-day,
  // so standings are correct even if nothing is live right now.
  useEffect(() => { refresh(true) }, [refresh])

  // Poll the live API while anything is live (narrow window for freshness)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (live_) pollRef.current = setInterval(() => refresh(false), API_POLL)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [live_, refresh])

  const hasContent = live.length > 0 || today.length > 0 || tomorrow.length > 0

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-9">
      <Hero live={live_} lastRefresh={lastRefresh} />

      {!hasContent && (
        <div className="text-center py-20 text-ink-3">
          <div className="text-5xl mb-4 opacity-60">⚽</div>
          <p>No hay partidos para hoy ni mañana.</p>
          <p className="text-xs mt-1">El fixture sigue más abajo en cada grupo.</p>
        </div>
      )}

      {live.length > 0 && (
        <Section title="En curso" accent="live" count={live.length}>
          <Grid>{live.map((m, i) => <MatchCard key={m.id} match={m} now={now} style={{ animationDelay: `${i*40}ms` }} />)}</Grid>
        </Section>
      )}

      {today.length > 0 && (
        <Section title="Hoy" accent="gold" count={today.length}>
          <Grid>{today.map((m, i) => <MatchCard key={m.id} match={m} now={now} style={{ animationDelay: `${i*40}ms` }} />)}</Grid>
        </Section>
      )}

      {tomorrow.length > 0 && (
        <Section title="Mañana" accent="grass" count={tomorrow.length}>
          <Grid>{tomorrow.map((m, i) => <MatchCard key={m.id} match={m} now={now} style={{ animationDelay: `${i*40}ms` }} />)}</Grid>
        </Section>
      )}

      <TournamentPulse />
      {new URLSearchParams(window.location.search).has('debug') && <ESPNDebugPanel />}
    </div>
  )
}

function ESPNDebugPanel() {
  const raw = (() => { try { return localStorage.getItem('__espn_debug') ?? 'sin datos' } catch { return 'error' } })()
  return (
    <div className="panel p-4 text-[11px] font-mono">
      <p className="text-[var(--color-live)] font-bold mb-2">DEBUG ESPN (último fetch)</p>
      <pre className="text-ink-2 whitespace-pre-wrap break-all max-h-[60vh] overflow-y-auto">{raw}</pre>
    </div>
  )
}

function Hero({ live, lastRefresh }: { live: boolean; lastRefresh: number | null }) {
  return (
    <div className="relative overflow-hidden panel-raised px-6 py-7 sm:px-8 sm:py-8">
      <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-[var(--color-grass)]/10 blur-3xl pointer-events-none" />
      <div className="absolute -left-10 -bottom-16 w-48 h-48 rounded-full bg-[var(--color-gold)]/8 blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <span className="chip chip-grass">2026</span>
          {live && (
            <span className="chip chip-live">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-live)] live-dot inline-block" /> EN VIVO AHORA
            </span>
          )}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
          Copa Mundial <span className="text-[var(--color-grass)]">FIFA 2026</span>
        </h1>
        <p className="text-ink-3 text-sm mt-2">
          11 Jun – 19 Jul · Canadá · México · Estados Unidos
          {lastRefresh && <span className="ml-2 text-ink-3">· datos al día</span>}
        </p>
      </div>
    </div>
  )
}

function Section({ title, accent, count, children }: {
  title: string; accent: 'live' | 'gold' | 'grass'; count: number; children: React.ReactNode
}) {
  const bar = accent === 'live' ? 'bg-[var(--color-live)]' : accent === 'gold' ? 'bg-[var(--color-gold)]' : 'bg-[var(--color-grass)]'
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <span className={`w-1 h-5 rounded-full ${bar}`} />
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <span className="text-xs text-ink-3 nums">{count}</span>
        <div className="flex-1 h-px hairline border-t" />
      </div>
      {children}
    </section>
  )
}

const Grid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>
)

function TournamentPulse() {
  const { matches } = useWorldCupStore()
  const finished  = matches.filter(m => m.status === 'finished').length
  const goals     = matches.reduce((s, m) => s + (m.homeScore ?? 0) + (m.awayScore ?? 0), 0)
  const total     = matches.length

  const stats = [
    { label: 'Partidos jugados', value: `${finished}`, sub: `de ${total}` },
    { label: 'Goles convertidos', value: `${goals}`, sub: finished ? `${(goals/finished).toFixed(1)} por partido` : '—' },
    { label: 'Equipos', value: '48', sub: '12 grupos' },
    { label: 'Fase actual', value: 'Grupos', sub: 'Jornada 1–2' },
  ]
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map(s => (
        <div key={s.label} className="panel p-4">
          <div className="text-2xl font-bold text-white font-display nums">{s.value}</div>
          <div className="text-[13px] text-ink-2 mt-0.5">{s.label}</div>
          <div className="text-[11px] text-ink-3 mt-0.5">{s.sub}</div>
        </div>
      ))}
    </div>
  )
}
