import { useState } from 'react'
import { useCustomers } from '../../hooks/useCustomers'
import type { Customer } from '../../types/customer'

interface Props {
  onSelect: (c: Customer) => void
  onAddNew: () => void
  onClose: () => void
}

export default function CustomerPickerModal({ onSelect, onAddNew, onClose }: Props) {
  const { customers } = useCustomers()
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? customers.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.phone.includes(query)
      )
    : customers

  const hasAllergy = (c: Customer) =>
    c.disease && c.disease !== '-' && c.disease !== ''

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <h2 className="text-sm font-semibold text-gray-800">เลือกลูกค้า</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Search */}
        <div className="px-4 py-2.5 border-b border-gray-100 shrink-0">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="ค้นหาชื่อ / เบอร์โทร..."
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">ไม่พบลูกค้า</div>
          ) : (
            filtered.map(c => (
              <button
                key={c.id}
                onClick={() => onSelect(c)}
                className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{c.name}</div>
                    {c.phone && <div className="text-xs text-gray-400">{c.phone}</div>}
                  </div>
                  {hasAllergy(c) && (
                    <span className="shrink-0 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      ⚠ แพ้ยา
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-gray-100 shrink-0">
          <button
            onClick={onAddNew}
            className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium py-1.5 hover:bg-blue-50 rounded-lg transition-colors"
          >
            + เพิ่มลูกค้าใหม่
          </button>
        </div>
      </div>
    </div>
  )
}
