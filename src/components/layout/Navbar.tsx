import { useWorldCupStore } from '../../store/useWorldCupStore'

const VIEWS = [
  { id: 'home' as const,       label: 'Inicio',      icon: '🏠' },
  { id: 'groups' as const,     label: 'Grupos',      icon: '📊' },
  { id: 'calculator' as const, label: 'Calculadora', icon: '🔮' },
]

export function Navbar() {
  const { currentView, setView, isRefreshing, refresh, lastRefresh } = useWorldCupStore()

  return (
    <header className="sticky top-0 z-50 border-b border-[#1e2d45] bg-[#0a0e1a]/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-2xl">🏆</span>
          <div>
            <div className="text-sm font-bold text-white leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Mundial Fácil
            </div>
            <div className="text-[10px] text-slate-500 leading-tight">FIFA 2026 · Canadá/México/EEUU</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          {VIEWS.map(v => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer',
                currentView === v.id
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5',
              ].join(' ')}
            >
              <span className="text-base">{v.icon}</span>
              <span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
        </nav>

        {/* Refresh */}
        <button
          onClick={refresh}
          disabled={isRefreshing}
          title={lastRefresh ? `Último refresh: ${new Date(lastRefresh).toLocaleTimeString('es-AR')}` : 'Actualizar datos'}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1"
        >
          <span className={isRefreshing ? 'animate-spin' : ''}>↻</span>
          <span className="hidden sm:inline">{isRefreshing ? 'Actualizando…' : 'Actualizar'}</span>
        </button>
      </div>
    </header>
  )
}
