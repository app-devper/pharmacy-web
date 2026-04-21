import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import Toast from '../ui/Toast'

/**
 * App shell.
 *
 * Responsive sidebar strategy:
 *  • <lg (desktop) → sidebar is a drawer overlay; Topbar shows a hamburger
 *    that toggles it. Clicking the scrim or navigating closes it.
 *  • ≥lg          → sidebar is a persistent left column (original layout).
 *
 * Keeping the drawer state here (not in Sidebar/Topbar) lets both the trigger
 * in the Topbar and the scrim in the drawer share a single source of truth.
 */
export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { pathname } = useLocation()

  // Auto-close the drawer when the user navigates — prevents the drawer from
  // blanketing the destination page on narrow screens.
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar — always visible on ≥lg */}
      <div className="hidden lg:block shrink-0">
        <Sidebar />
      </div>

      {/* Mobile/tablet drawer — slides in from the left */}
      <div
        className={`lg:hidden fixed inset-0 z-40 transition-opacity ${
          drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!drawerOpen}
      >
        <div
          className="absolute inset-0 bg-black/50"
          onClick={() => setDrawerOpen(false)}
        />
        <div
          className={`absolute top-0 bottom-0 left-0 transition-transform duration-200 ease-out ${
            drawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Sidebar />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMenuClick={() => setDrawerOpen(true)} />
        <main className="flex-1 overflow-auto bg-gray-50">
          <Outlet />
        </main>
      </div>
      <Toast />
    </div>
  )
}
