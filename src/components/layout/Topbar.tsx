import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import ExpiryAlert from './ExpiryAlert'
import LowStockAlert from './LowStockAlert'
import NetworkStatus from './NetworkStatus'

const pageTitles: Record<string, string> = {
  '/sell':      'หน้าขายยา',
  '/sales':     'ประวัติการขาย',
  '/stock':     'สต็อกยา',
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
}

export default function Topbar() {
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

  const title = pageTitles[pathname] ?? ''
  const dateStr = time.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const timeStr = time.toLocaleTimeString('th-TH')

  const roleBadge: Record<string, string> = {
    SUPER: 'bg-purple-100 text-purple-700',
    ADMIN: 'bg-blue-100 text-blue-700',
    USER:  'bg-gray-100 text-gray-700',
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
      <div className="flex items-center gap-4">
        <NetworkStatus />
        <LowStockAlert />
        <ExpiryAlert />
        <div className="text-sm text-gray-500">{dateStr} {timeStr}</div>
        {user && (
          <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${roleBadge[user.role] || 'bg-gray-100 text-gray-700'}`}>
              {user.role}
            </span>
            <span className="text-sm text-gray-700">{user.firstName}</span>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors ml-1"
              title="ออกจากระบบ"
            >
              ออก
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
