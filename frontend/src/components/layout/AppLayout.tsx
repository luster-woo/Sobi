import { Outlet } from 'react-router-dom'

import AppHeader from './AppHeader'
import AppSidebar from './AppSidebar'

export default function AppLayout() {
  return (
    <div className="bg-bg min-h-screen">
      <AppSidebar />
      <div className="pl-sidebar min-w-0">
        <AppHeader />
        <main className="p-section mx-auto max-w-[1200px]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
