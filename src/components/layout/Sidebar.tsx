import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useIsAdmin } from '../../hooks/useIsAdmin'
import { useSettings } from '../../context/SettingsContext'

const mainItems = [
  { to: '/sell',      icon: '🛒', label: 'หน้าขายยา',              adminOnly: false },
  { to: '/sales',     icon: '🧾', label: 'ประวัติการขาย',           adminOnly: false },
  { to: '/stock',     icon: '📦', label: 'สต็อกยา',                adminOnly: false },
  { to: '/stock-count', icon: '🧮', label: 'ตรวจนับสต็อก',          adminOnly: true  },
  { to: '/expiry',    icon: '⏰', label: 'จัดการวันหมดอายุ',        adminOnly: true  },
  { to: '/movements', icon: '📋', label: 'ความเคลื่อนไหวสต็อก',    adminOnly: false },
  { to: '/offline-sync', icon: '🔄', label: 'รายการค้างซิงค์',       adminOnly: false },
  { to: '/imports',   icon: '📥', label: 'นำเข้าสินค้า',            adminOnly: true  },
  { to: '/suppliers', icon: '🏭', label: 'ซัพพลายเออร์',            adminOnly: true  },
  { to: '/customers', icon: '👥', label: 'ลูกค้า',                  adminOnly: false },
  { to: '/report',    icon: '📊', label: 'รายงาน',                  adminOnly: false },
  { to: '/profit',    icon: '💰', label: 'กำไร',                    adminOnly: true  },
  { to: '/users',     icon: '🔐', label: 'จัดการผู้ใช้งาน',          adminOnly: true  },
  { to: '/settings',  icon: '⚙️', label: 'ตั้งค่าระบบ',              adminOnly: true  },
  { to: '/help',      icon: '📖', label: 'คู่มือการใช้งาน',           adminOnly: false },
]

const kyItems = [
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
  const isAdmin = useIsAdmin()
  const { settings } = useSettings()
  const kyActive = kyItems.some(k => location.pathname.startsWith(k.to))
  const [kyOpen, setKyOpen] = useState(kyActive)

  const visibleItems = mainItems.filter(item => !item.adminOnly || isAdmin)
  const shopName = settings.store.name || 'ร้านยา'

  return (
    <aside className="w-56 bg-slate-800 text-white flex flex-col min-h-screen shrink-0">
      <div className="px-4 py-5 border-b border-slate-700">
        <div className="text-base font-bold text-white truncate">{shopName}</div>
        <div className="text-xs text-slate-400 mt-0.5">ระบบ POS ร้านขายยา</div>
      </div>

      <nav className="flex-1 py-3">
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
        {isAdmin && (
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
                {kyItems.map(item => (
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
