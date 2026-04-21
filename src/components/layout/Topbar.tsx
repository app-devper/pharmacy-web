import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import ExpiryAlert from './ExpiryAlert'
import NetworkStatus from './NetworkStatus'

const pageTitles: Record<string, string> = {
  '/sell':      'หน้าขายยา',
  '/sales':     'ประวัติการขาย',
  '/stock':     'สต็อกยา',
  '/stock/new': 'เพิ่มยาใหม่',
  '/expiry':    'จัดการวันหมดอายุ',
  '/customers': 'ลูกค้า',
  '/suppliers': 'ซัพพลายเออร์',
  '/imports':   'นำเข้าสินค้า',
  '/report':    'รายงาน',
  '/profit':    'รายงานกำไร',
  '/ky9':       'ขย.9 — บัญชีการซื้อยา',
  '/ky10':      'ขย.10 — บัญชีการขายยาควบคุมพิเศษ',
  '/ky11':      'ขย.11 — บัญชีการขายยาอันตราย',
  '/ky12':      'ขย.12 — บัญชีการขายยาตามใบสั่งแพทย์',
  '/users':     'จัดการผู้ใช้งาน',
  '/movements': 'ความเคลื่อนไหวสต็อก',
  '/profile':   'โปรไฟล์ของฉัน',
  '/settings':  'ตั้งค่าระบบ',
  '/help':      'คู่มือการใช้งาน',
}

interface Props {
  /** Called when the hamburger is tapped (mobile/tablet only). */
  onMenuClick?: () => void
}

export default function Topbar({ onMenuClick }: Props) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  // Pattern match for dynamic routes (e.g. /stock/:id/edit)
  const resolvedTitle = pageTitles[pathname]
    ?? (/^\/stock\/[^/]+\/edit$/.test(pathname) ? 'แก้ไขยา' : '')
  const title = resolvedTitle
  const dateStr = time.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const timeStr = time.toLocaleTimeString('th-TH')

  const roleBadge: Record<string, string> = {
    SUPER: 'bg-purple-100 text-purple-700',
    ADMIN: 'bg-blue-100 text-blue-700',
    USER:  'bg-gray-100 text-gray-700',
  }

  return (
    <header className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        {/* Hamburger — mobile/tablet only */}
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="เปิดเมนู"
          className="lg:hidden -ml-1 p-2 rounded-lg text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <h1 className="text-base sm:text-lg font-semibold text-gray-800 truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <NetworkStatus />
        <ExpiryAlert />
        {/* Date/time — hidden on small screens to save space */}
        <div className="hidden md:block text-sm text-gray-500 whitespace-nowrap">{dateStr} {timeStr}</div>
        {user && (
          <div className="flex items-center gap-2 sm:pl-3 sm:border-l sm:border-gray-200">
            <span className={`hidden sm:inline px-2 py-0.5 rounded text-xs font-medium ${roleBadge[user.role] || 'bg-gray-100 text-gray-700'}`}>
              {user.role}
            </span>
            <button
              onClick={() => navigate('/profile')}
              className="text-sm text-gray-700 hover:text-blue-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded max-w-[8rem] truncate"
              title="โปรไฟล์ของฉัน"
            >
              {user.firstName}
            </button>
            <button
              onClick={handleLogout}
              aria-label="ออกจากระบบ"
              className="hidden sm:inline text-xs text-gray-400 hover:text-red-500 transition-colors ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded"
              title="ออกจากระบบ"
            >
              ออกจากระบบ
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
