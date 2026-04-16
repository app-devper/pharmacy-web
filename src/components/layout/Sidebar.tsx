import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

const mainItems = [
  { to: '/sell',      icon: '🛒', label: 'หน้าขายยา' },
  { to: '/sales',     icon: '🧾', label: 'ประวัติการขาย' },
  { to: '/stock',     icon: '📦', label: 'สต็อกยา' },
  { to: '/expiry',    icon: '⏰', label: 'จัดการวันหมดอายุ' },
  { to: '/imports',   icon: '📥', label: 'นำเข้าสินค้า' },
  { to: '/suppliers', icon: '🏭', label: 'ซัพพลายเออร์' },
  { to: '/customers', icon: '👥', label: 'ลูกค้า' },
  { to: '/report',    icon: '📊', label: 'รายงาน' },
  { to: '/profit',    icon: '💰', label: 'กำไร' },
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
  const kyActive = kyItems.some(k => location.pathname.startsWith(k.to))
  const [kyOpen, setKyOpen] = useState(kyActive)

  return (
    <aside className="w-56 bg-slate-800 text-white flex flex-col min-h-screen shrink-0">
      <div className="px-4 py-5 border-b border-slate-700">
        <div className="text-base font-bold text-white">ร้านยา เฮลท์ตี้ฟาร์ม</div>
        <div className="text-xs text-slate-400 mt-0.5">ระบบ POS ร้านขายยา</div>
      </div>

      <nav className="flex-1 py-3">
        {/* Main nav items */}
        {mainItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => linkClass(isActive)}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}

        {/* KY Forms group */}
        <div className="mt-1">
          <button
            onClick={() => setKyOpen(o => !o)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
              kyActive
                ? 'text-blue-400'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <span>📋</span>
            <span className="flex-1 text-left">แบบฟอร์ม ขย.</span>
            <span className={`text-xs transition-transform duration-200 ${kyOpen ? 'rotate-180' : ''}`}>
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
      </nav>
    </aside>
  )
}
