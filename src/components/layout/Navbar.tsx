import { useEffect, useState } from 'react'
import { useWorldCupStore } from '../../store/useWorldCupStore'
import { IconHome, IconGroups, IconBracket, IconCalc, IconCalendar, IconRefresh, IconTrophy } from '../ui/icons'
import { timeAgo } from '../../lib/dateUtils'

const VIEWS = [
  { id: 'home' as const,       label: 'Inicio',      Icon: IconHome },
  { id: 'calendar' as const,   label: 'Calendario',  Icon: IconCalendar },
  { id: 'groups' as const,     label: 'Grupos',      Icon: IconGroups },
  { id: 'brackets' as const,   label: 'Llaves',      Icon: IconBracket },
  { id: 'calculator' as const, label: 'Cruces',      Icon: IconCalc },
]

export function Navbar() {
  const { currentView, setView, isRefreshing, refresh, lastRefresh, hasLiveMatches } = useWorldCupStore()
  const live = hasLiveMatches()
  const [, force] = useState(0)

  // tick the "actualizado hace Xs" label
  useEffect(() => {
    const t = setInterval(() => force(n => n + 1), 5000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className="sticky top-0 z-50 border-b hairline bg-[var(--color-base)]/85 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {/* Logo */}
        <button onClick={() => setView('home')} className="flex items-center gap-2.5 shrink-0 cursor-pointer group">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--color-grass)]/25 to-[var(--color-gold)]/10 border border-[var(--color-line-2)] text-[var(--color-gold)] group-hover:scale-105 transition-transform">
            <IconTrophy size={19} />
          </span>
          <div className="text-left leading-none">
            <div className="text-[15px] font-bold text-white font-display tracking-tight">Mundial Fácil</div>
            <div className="text-[10px] text-ink-3 mt-0.5">FIFA World Cup 2026</div>
          </div>
        </button>

        {/* Nav */}
        <nav className="flex items-center gap-1 rounded-xl bg-[var(--color-surface)]/60 border hairline p-1">
          {VIEWS.map(({ id, label, Icon }) => {
            const active = currentView === id
            return (
              <button
                key={id}
                onClick={() => setView(id)}
                className={[
                  'relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150 cursor-pointer',
                  active ? 'bg-[var(--color-raised)] text-white shadow-sm' : 'text-ink-3 hover:text-ink-2',
                ].join(' ')}
              >
                <Icon size={17} className={active ? 'text-[var(--color-grass)]' : ''} />
                <span className="hidden sm:inline">{label}</span>
                {id === 'home' && live && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--color-live)] live-dot" />
                )}
              </button>
            )
          })}
        </nav>

        {/* Refresh */}
        <button
          onClick={() => refresh(true)}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 text-[11px] text-ink-3 hover:text-ink-2 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
          title="Actualizar resultados"
        >
          <IconRefresh size={15} className={isRefreshing ? 'animate-spin' : ''} />
          <span className="hidden md:inline tabular-nums">
            {isRefreshing ? 'Actualizando…' : lastRefresh ? timeAgo(lastRefresh) : 'Actualizar'}
          </span>
        </button>
      </div>
    </header>
  )
}
