import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { canOpen, type Page } from '../../lib/access'
import { useSettings } from '../../context/SettingsContext'

// Each item shows when its page may be opened (lib/access, the same table
// the route guards read).
const mainItems: { to: Page; icon: string; label: string }[] = [
  { to: '/sell',      icon: '🛒', label: 'หน้าขายยา' },
  { to: '/sales',     icon: '🧾', label: 'ประวัติการขาย' },
  { to: '/stock',     icon: '📦', label: 'สต็อกยา' },
  { to: '/stock-count', icon: '🧮', label: 'ตรวจนับสต็อก' },
  { to: '/labels',    icon: '🏷️', label: 'พิมพ์ฉลากบาร์โค้ด' },
  { to: '/expiry',    icon: '⏰', label: 'จัดการวันหมดอายุ' },
  { to: '/movements', icon: '📋', label: 'ความเคลื่อนไหวสต็อก' },
  { to: '/offline-sync', icon: '🔄', label: 'รายการค้างซิงค์' },
  { to: '/imports',   icon: '📥', label: 'นำเข้าสินค้า' },
  { to: '/suppliers', icon: '🏭', label: 'ซัพพลายเออร์' },
  { to: '/customers', icon: '👥', label: 'ลูกค้า' },
  { to: '/report',    icon: '📊', label: 'รายงาน' },
  { to: '/profit',    icon: '💰', label: 'กำไร' },
  { to: '/users',     icon: '🔐', label: 'จัดการผู้ใช้งาน' },
  { to: '/settings',  icon: '⚙️', label: 'ตั้งค่าระบบ' },
  { to: '/help',      icon: '📖', label: 'คู่มือการใช้งาน' },
]

const kyItems: { to: Page; label: string }[] = [
  { to: '/ky9',  label: 'ขย.9' },
  { to: '/ky10', label: 'ขย.10' },
  { to: '/ky11', label: 'ขย.11' },
  { to: '/ky12', label: 'ขย.12' },
]

const linkClass = (isActive: boolean) =>
  `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
    isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
  }`

export default function Sidebar() {
  const location = useLocation()
  const { user } = useAuth()
  const { settings } = useSettings()
  const kyActive = kyItems.some(k => location.pathname.startsWith(k.to))
  const [kyOpen, setKyOpen] = useState(kyActive)

  const visibleItems = mainItems.filter(item => canOpen(user?.role, item.to))
  const visibleKy = kyItems.filter(item => canOpen(user?.role, item.to))
  const shopName = settings.store.name || 'ร้านยา'

  return (
    <aside className="w-56 bg-slate-800 text-white flex flex-col h-full shrink-0">
      <div className="px-4 py-5 border-b border-slate-700">
        <div className="text-base font-bold text-white truncate">{shopName}</div>
        <div className="text-xs text-slate-400 mt-0.5">ระบบ POS ร้านขายยา</div>
      </div>

      <nav className="flex-1 py-3 overflow-y-auto">
        {/* Main nav items */}
        {visibleItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => linkClass(isActive)}
          >
            <span aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}

        {/* KY Forms group — ADMIN only */}
        {visibleKy.length > 0 && (
          <div className="mt-1">
            <button
              onClick={() => setKyOpen(o => !o)}
              aria-expanded={kyOpen}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                kyActive
                  ? 'text-blue-400'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <span aria-hidden="true">📋</span>
              <span className="flex-1 text-left">แบบฟอร์ม ขย.</span>
              <span aria-hidden="true" className={`text-xs transition-transform duration-200 ${kyOpen ? 'rotate-180' : ''}`}>
                ▾
              </span>
            </button>

            {kyOpen && (
              <div className="bg-slate-900/50">
                {visibleKy.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 pl-11 pr-4 py-2 text-sm transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>
    </aside>
  )
}
