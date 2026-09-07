import { Outlet } from 'react-router-dom'
import AppHeader from './AppHeader'
import AppSidebar from './AppSidebar'

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="min-w-0 pl-sidebar">
        <AppHeader />
        <main className="mx-auto max-w-[1200px] p-section">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
