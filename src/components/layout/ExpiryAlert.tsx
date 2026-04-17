import { useState, useEffect, useRef } from 'react'
import { getExpiringLots, type ExpiringLot } from '../../api/lots'

type Group = { label: string; color: string; dot: string; items: ExpiringLot[] }

function groupLots(lots: ExpiringLot[]): Group[] {
  const expired  = lots.filter(l => l.days_left < 0)
  const urgent   = lots.filter(l => l.days_left >= 0 && l.days_left <= 7)
  const warning  = lots.filter(l => l.days_left >= 8 && l.days_left <= 30)
  const notice   = lots.filter(l => l.days_left >= 31)

  const groups: Group[] = []
  if (expired.length)  groups.push({ label: 'หมดอายุแล้ว',  color: 'text-red-600',    dot: 'bg-red-500',    items: expired })
  if (urgent.length)   groups.push({ label: '≤ 7 วัน',      color: 'text-orange-600', dot: 'bg-orange-400', items: urgent })
  if (warning.length)  groups.push({ label: '≤ 30 วัน',     color: 'text-yellow-600', dot: 'bg-yellow-400', items: warning })
  if (notice.length)   groups.push({ label: '≤ 60 วัน',     color: 'text-blue-600',   dot: 'bg-blue-400',   items: notice })
  return groups
}

function daysLabel(d: number): string {
  if (d < 0) return `${Math.abs(d)} วันที่แล้ว`
  if (d === 0) return 'วันนี้'
  return `อีก ${d} วัน`
}

export default function ExpiryAlert() {
  const [lots, setLots]     = useState<ExpiringLot[]>([])
  const [open, setOpen]     = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const refresh = () => getExpiringLots(60).then(setLots).catch(() => {})
    refresh()
    window.addEventListener('pharmacy:stock-changed', refresh)
    return () => window.removeEventListener('pharmacy:stock-changed', refresh)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (lots.length === 0) return null

  const hasExpired = lots.some(l => l.days_left < 0)
  const badgeColor = hasExpired ? 'bg-red-500' : 'bg-orange-400'
  const groups = groupLots(lots)

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
        title="แจ้งเตือนใกล้หมดอายุ"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <span className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center ${badgeColor}`}>
          {lots.length}
        </span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-800">
              ⚠ ใกล้หมดอายุ ({lots.length} รายการ)
            </span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
          </div>

          {/* Groups */}
          <div className="max-h-80 overflow-y-auto">
            {groups.map(group => (
              <div key={group.label}>
                {/* Group label */}
                <div className={`flex items-center gap-1.5 px-4 py-1.5 bg-gray-50 text-xs font-semibold ${group.color}`}>
                  <span className={`w-2 h-2 rounded-full ${group.dot}`} />
                  {group.label}
                </div>
                {/* Items */}
                {group.items.map(lot => (
                  <div key={lot.id} className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-800 truncate">{lot.drug_name}</div>
                      <div className="text-xs text-gray-400 font-mono">{lot.lot_number}</div>
                    </div>
                    <div className="shrink-0 text-right ml-3">
                      <div className={`text-xs font-semibold ${lot.days_left < 0 ? 'text-red-500' : lot.days_left <= 7 ? 'text-orange-500' : 'text-gray-500'}`}>
                        {daysLabel(lot.days_left)}
                      </div>
                      <div className="text-xs text-gray-400">เหลือ {lot.remaining}</div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
