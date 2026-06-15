import { useEffect } from 'react'
import { Navbar } from './components/layout/Navbar'
import { HomeView } from './components/home/HomeView'
import { GroupsView } from './components/groups/GroupsView'
import { BracketsView } from './components/brackets/BracketsView'
import { CalculatorView } from './components/calculator/CalculatorView'
import { useWorldCupStore } from './store/useWorldCupStore'

export default function App() {
  const { currentView, refresh } = useWorldCupStore()

  useEffect(() => {
    refresh()
  }, [])

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 pb-12">
        {currentView === 'home'       && <HomeView />}
        {currentView === 'groups'     && <GroupsView />}
        {currentView === 'brackets'   && <BracketsView />}
        {currentView === 'calculator' && <CalculatorView />}
      </main>
      <footer className="border-t hairline py-5 text-center text-[11px] text-ink-3">
        Mundial Fácil · datos del seed + API opcional · zona horaria Argentina (UTC-3)
      </footer>
    </div>
  )
}
