import { useState, useEffect, useRef } from 'react'
import { getLowStockDrugs } from '../../api/drugs'
import type { Drug } from '../../types/drug'

type Group = { label: string; color: string; dot: string; items: Drug[] }

function groupDrugs(drugs: Drug[]): Group[] {
  const outOfStock = drugs.filter(d => d.stock === 0)
  const lowStock   = drugs.filter(d => d.stock > 0)

  const groups: Group[] = []
  if (outOfStock.length) groups.push({ label: 'หมดแล้ว',  color: 'text-red-600',   dot: 'bg-red-500',   items: outOfStock })
  if (lowStock.length)   groups.push({ label: 'ใกล้หมด', color: 'text-amber-600', dot: 'bg-amber-400', items: lowStock })
  return groups
}

export default function LowStockAlert() {
  const [drugs, setDrugs] = useState<Drug[]>([])
  const [open, setOpen]   = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getLowStockDrugs().then(setDrugs).catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (drugs.length === 0) return null

  const hasOutOfStock = drugs.some(d => d.stock === 0)
  const badgeColor = hasOutOfStock ? 'bg-red-500' : 'bg-amber-400'
  const groups = groupDrugs(drugs)

  return (
    <div ref={ref} className="relative">
      {/* Icon button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
        title="แจ้งเตือนสต็อกต่ำ"
      >
        {/* Box / package icon */}
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
        </svg>
        <span className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center ${badgeColor}`}>
          {drugs.length}
        </span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-800">
              ⚠ สต็อกต่ำ ({drugs.length} รายการ)
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
                {group.items.map(drug => (
                  <div key={drug.id} className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-800 truncate">{drug.name}</div>
                      {drug.generic_name && (
                        <div className="text-xs text-gray-400 truncate">{drug.generic_name}</div>
                      )}
                    </div>
                    <div className="shrink-0 text-right ml-3">
                      <div className={`text-xs font-semibold ${drug.stock === 0 ? 'text-red-500' : 'text-amber-500'}`}>
                        เหลือ {drug.stock} {drug.unit}
                      </div>
                      <div className="text-xs text-gray-400">เตือนเมื่อ ≤ {drug.min_stock}</div>
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
