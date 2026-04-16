import { useState, useEffect, useMemo, useCallback } from 'react'
import type { ExpiringLot } from '../api/lots'
import { getExpiringLots, getExpiredLots, writeoffLots } from '../api/lots'
import { exportExpiryXlsx } from '../utils/exportXlsx'
import { useToast } from '../hooks/useToast'
import Spinner from '../components/ui/Spinner'

// ─── Filter tabs ─────────────────────────────────────────────────────────────

const FILTER_TABS = [
  { label: '30 วัน',        days: 30  },
  { label: '60 วัน',        days: 60  },
  { label: '90 วัน',        days: 90  },
  { label: '180 วัน',       days: 180 },
  { label: 'หมดอายุแล้ว',  days: -1  }, // -1 = expired_only mode
] as const

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusBadge(daysLeft: number) {
  if (daysLeft < 0)   return { cls: 'bg-red-100 text-red-700',      label: 'หมดอายุแล้ว' }
  if (daysLeft <= 7)  return { cls: 'bg-orange-100 text-orange-700', label: `อีก ${daysLeft} วัน` }
  if (daysLeft <= 30) return { cls: 'bg-yellow-100 text-yellow-700', label: `อีก ${daysLeft} วัน` }
  return               { cls: 'bg-blue-100 text-blue-700',           label: `อีก ${daysLeft} วัน` }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ExpiryPage() {
  const showToast = useToast()
  const [activeTab, setActiveTab] = useState(1)          // default: 60 วัน
  const [data, setData]           = useState<ExpiringLot[]>([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState<Set<string>>(new Set())
  const [acting, setActing]       = useState(false)

  const tab = FILTER_TABS[activeTab]

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true)
    setSelected(new Set())
    try {
      const result = tab.days === -1
        ? await getExpiredLots()
        : await getExpiringLots(tab.days)
      setData(result)
    } catch (e) {
      showToast((e as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }, [tab.days, showToast])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Selection helpers ─────────────────────────────────────────────────────

  const allIds       = useMemo(() => data.map(l => l.id), [data])
  const allSelected  = allIds.length > 0 && allIds.every(id => selected.has(id))
  const someSelected = selected.size > 0

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(allIds))

  const toggleOne = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  // ── Write-off ─────────────────────────────────────────────────────────────

  const handleWriteoff = async (ids: string[], count: number) => {
    if (!window.confirm(`ยืนยันเขียนทิ้ง ${count} รายการ?\nสต็อกจะถูกหักออกและไม่สามารถกู้คืนได้`)) return
    setActing(true)
    try {
      const res = await writeoffLots(ids)
      showToast(`เขียนทิ้งแล้ว ${res.written_off} รายการ`, 'success')
      fetchData()
    } catch (e) {
      showToast((e as Error).message, 'error')
    } finally {
      setActing(false)
    }
  }

  const handleBulkWriteoff = () =>
    handleWriteoff(Array.from(selected), selected.size)

  const handleSingleWriteoff = (lot: ExpiringLot) =>
    handleWriteoff([lot.id], 1)

  // ── Summary stats ─────────────────────────────────────────────────────────

  const totalUnits = useMemo(() => data.reduce((s, l) => s + l.remaining, 0), [data])

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6">

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5">
        {FILTER_TABS.map((t, i) => (
          <button
            key={t.label}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              activeTab === i
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Summary bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-gray-500">
          {loading ? '...' : (
            <span>
              <span className="font-semibold text-gray-800">{data.length}</span> รายการ
              {' · '}
              รวม <span className="font-semibold text-gray-800">{totalUnits.toLocaleString()}</span> หน่วย
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportExpiryXlsx(data, tab.label)}
            disabled={loading || data.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>📥</span> Export XLSX
          </button>
          <button
            onClick={handleBulkWriteoff}
            disabled={!someSelected || acting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>🗑</span>
            {someSelected ? `เขียนทิ้งที่เลือก (${selected.size})` : 'เขียนทิ้งที่เลือก'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-green-600">
            <span className="text-3xl">✅</span>
            <span className="text-sm font-medium">
              ไม่มียาที่{tab.days === -1 ? 'หมดอายุแล้ว' : `ใกล้หมดอายุในช่วง ${tab.label}`}
            </span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs">ชื่อยา</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs">เลขล็อต</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs">วันหมดอายุ</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600 text-xs">คงเหลือ</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs">สถานะ</th>
                  <th className="py-3 px-4 w-24" />
                </tr>
              </thead>
              <tbody>
                {data.map(lot => {
                  const badge = statusBadge(lot.days_left)
                  const isSelected = selected.has(lot.id)
                  return (
                    <tr
                      key={lot.id}
                      className={`border-t border-gray-50 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50/40' : ''}`}
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(lot.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-800">{lot.drug_name}</td>
                      <td className="py-3 px-4 text-gray-500 font-mono text-xs">{lot.lot_number}</td>
                      <td className="py-3 px-4 text-gray-600">{fmtDate(lot.expiry_date)}</td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-800">
                        {lot.remaining.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleSingleWriteoff(lot)}
                          disabled={acting}
                          className="text-xs px-2.5 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          เขียนทิ้ง
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
