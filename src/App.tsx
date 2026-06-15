import { useEffect } from 'react'
import { Navbar } from './components/layout/Navbar'
import { HomeView } from './components/home/HomeView'
import { GroupsView } from './components/groups/GroupsView'
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
        {currentView === 'calculator' && <CalculatorView />}
      </main>
    </div>
  )
}
