import { useState, useEffect, useCallback, useRef } from 'react'
import { getMovements } from '../api/movements'
import { useToast } from '../hooks/useToast'
import { fmtDateTime, fmtDateThai } from '../utils/formatters'
import type { Movement, MovementType } from '../types/movement'
import Spinner from '../components/ui/Spinner'
import * as XLSX from 'xlsx'

const PAGE_SIZE = 50

// ─── Type config ─────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<MovementType, { label: string; icon: string; bg: string; text: string }> = {
  import:     { label: 'นำเข้า',   icon: '📥', bg: 'bg-blue-100',   text: 'text-blue-700'   },
  sale:       { label: 'ขาย',      icon: '🛒', bg: 'bg-red-100',    text: 'text-red-700'    },
  return:     { label: 'คืนยา',    icon: '↩️', bg: 'bg-green-100',  text: 'text-green-700'  },
  adjustment: { label: 'ปรับสต็อก', icon: '✏️', bg: 'bg-orange-100', text: 'text-orange-700' },
  writeoff:   { label: 'ตัดสต็อก', icon: '🗑️', bg: 'bg-gray-100',   text: 'text-gray-600'   },
}

const ALL_TYPES: MovementType[] = ['import', 'sale', 'return', 'adjustment', 'writeoff']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysAgoStr(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MovementsPage() {
  const showToast = useToast()

  // filters
  const [from, setFrom]     = useState(daysAgoStr(30))
  const [to, setTo]         = useState(todayStr())
  const [search, setSearch] = useState('')
  const [types, setTypes]   = useState<Set<MovementType>>(new Set(ALL_TYPES))
  const [page, setPage]     = useState(0)

  // data
  const [items, setItems]   = useState<Movement[]>([])
  const [total, setTotal]   = useState(0)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  // debounce search
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setDebouncedSearch(search); setPage(0) }, 400)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [search])

  const fetch = useCallback(async (pageNum = 0) => {
    setLoading(true)
    try {
      const res = await getMovements({
        from, to,
        drug_name: debouncedSearch || undefined,
        types: types.size === ALL_TYPES.length ? undefined : [...types].join(','),
        limit: PAGE_SIZE,
        offset: pageNum * PAGE_SIZE,
      })
      setItems(res.items)
      setTotal(res.total)
    } catch (e) {
      showToast((e as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }, [from, to, debouncedSearch, types, showToast])

  useEffect(() => { fetch(page) }, [fetch, page])

  // reset page on filter change
  useEffect(() => { setPage(0) }, [from, to, types, debouncedSearch])

  const toggleType = (t: MovementType) => {
    setTypes(prev => {
      const next = new Set(prev)
      next.has(t) ? next.delete(t) : next.add(t)
      return next
    })
  }

  const toggleAll = () => {
    setTypes(types.size === ALL_TYPES.length ? new Set() : new Set(ALL_TYPES))
  }

  // ── Export XLSX ──
  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await getMovements({
        from, to,
        drug_name: debouncedSearch || undefined,
        types: types.size === ALL_TYPES.length ? undefined : [...types].join(','),
        limit: 5000,
        offset: 0,
      })
      const rows = res.items.map(m => ({
        วันที่เวลา:   fmtDateTime(m.at),
        ประเภท:      TYPE_CONFIG[m.type]?.label ?? m.type,
        ชื่อยา:      m.drug_name,
        เลขอ้างอิง:  m.reference,
        จำนวน:       m.delta > 0 ? `+${m.delta}` : String(m.delta),
        หมายเหตุ:    m.note,
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Movement')
      XLSX.writeFile(wb, `movement_${from}_${to}.xlsx`)
    } catch (e) {
      showToast((e as Error).message, 'error')
    } finally {
      setExporting(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header ── */}
      <div className="px-6 py-4 border-b border-gray-100 shrink-0">
        <h1 className="text-lg font-bold text-gray-800">ความเคลื่อนไหวสต็อก</h1>
        <p className="text-xs text-gray-400 mt-0.5">ประวัติการเปลี่ยนแปลงสต็อกจากทุกแหล่ง</p>
      </div>

      {/* ── Filter bar ── */}
      <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 shrink-0 space-y-2">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Date range */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">จาก</label>
            <input type="date" value={from} max={to}
              onChange={e => setFrom(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
            <label className="text-xs text-gray-500">ถึง</label>
            <input type="date" value={to} min={from} max={todayStr()}
              onChange={e => setTo(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
          </div>

          {/* Drug search */}
          <input
            type="text"
            placeholder="🔍 ค้นหาชื่อยา"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400 w-48"
          />

          <div className="flex-1" />

          {/* Export */}
          <button
            onClick={handleExport}
            disabled={exporting || total === 0}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors disabled:opacity-40"
          >
            {exporting ? 'กำลัง export...' : '⬇ Export XLSX'}
          </button>
        </div>

        {/* Type pills */}
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-gray-400">ประเภท:</span>
          <button
            onClick={toggleAll}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              types.size === ALL_TYPES.length
                ? 'bg-gray-700 text-white border-gray-700'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
            }`}
          >
            ทั้งหมด
          </button>
          {ALL_TYPES.map(t => {
            const cfg = TYPE_CONFIG[t]
            const active = types.has(t)
            return (
              <button key={t} onClick={() => toggleType(t)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  active
                    ? `${cfg.bg} ${cfg.text} border-transparent`
                    : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                }`}
              >
                <span>{cfg.icon}</span>
                <span>{cfg.label}</span>
              </button>
            )
          })}
          {total > 0 && (
            <span className="ml-auto text-xs text-gray-400">{total.toLocaleString()} รายการ</span>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
            <span className="text-4xl">📋</span>
            <span className="text-sm">ไม่พบข้อมูลในช่วงเวลานี้</span>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="text-left py-2.5 px-4 text-xs text-gray-500 font-semibold w-40">วันที่/เวลา</th>
                <th className="text-left py-2.5 px-3 text-xs text-gray-500 font-semibold w-28">ประเภท</th>
                <th className="text-left py-2.5 px-3 text-xs text-gray-500 font-semibold">ชื่อยา</th>
                <th className="text-left py-2.5 px-3 text-xs text-gray-500 font-semibold w-36">เลขอ้างอิง</th>
                <th className="text-right py-2.5 px-4 text-xs text-gray-500 font-semibold w-20">จำนวน</th>
                <th className="text-left py-2.5 px-4 text-xs text-gray-500 font-semibold">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {items.map((m, idx) => {
                const cfg = TYPE_CONFIG[m.type]
                const isIn = m.delta > 0
                return (
                  <tr key={`${m.id}-${idx}`} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 px-4 text-xs text-gray-500 whitespace-nowrap">
                      {fmtDateThai(m.at)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg?.bg} ${cfg?.text}`}>
                        <span>{cfg?.icon}</span>
                        <span>{cfg?.label ?? m.type}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-gray-800 max-w-[200px] truncate">
                      {m.drug_name}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-xs text-gray-500">
                      {m.reference || '—'}
                    </td>
                    <td className={`py-2.5 px-4 text-right font-bold ${isIn ? 'text-green-600' : 'text-red-500'}`}>
                      {isIn ? `+${m.delta}` : m.delta}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-gray-400 max-w-[160px] truncate">
                      {m.note || '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ── */}
      {!loading && total > PAGE_SIZE && (
        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between shrink-0 bg-white">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← ก่อนหน้า
          </button>
          <span className="text-xs text-gray-500">
            หน้า {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ถัดไป →
          </button>
        </div>
      )}
    </div>
  )
}
