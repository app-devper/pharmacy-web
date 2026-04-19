import { useState } from 'react'
import type { ProfitReport, DrugProfit } from '../types/profitReport'
import { getProfitReport } from '../api/report'
import { useToast } from '../hooks/useToast'
import { fmtMoney } from '../utils/formatters'
import { exportProfitXlsx } from '../utils/exportXlsx'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'

type SortCol = keyof Pick<DrugProfit, 'drug_name' | 'qty_sold' | 'revenue' | 'cost' | 'profit' | 'margin'>

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}
function monthStartStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function daysAgoStr(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n + 1)
  return d.toISOString().slice(0, 10)
}
function lastMonthRange(): [string, string] {
  const d = new Date()
  const y = d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear()
  const m = d.getMonth() === 0 ? 12 : d.getMonth()
  const last = new Date(y, m, 0).getDate()
  const mm = String(m).padStart(2, '0')
  return [`${y}-${mm}-01`, `${y}-${mm}-${last}`]
}

const PRESETS = [
  { label: 'วันนี้',       getRange: (): [string, string] => [todayStr(), todayStr()] },
  { label: 'สัปดาห์นี้',  getRange: (): [string, string] => [daysAgoStr(7), todayStr()] },
  { label: 'เดือนนี้',     getRange: (): [string, string] => [monthStartStr(), todayStr()] },
  { label: 'เดือนที่แล้ว', getRange: lastMonthRange },
]

function marginColor(m: number) {
  if (m >= 20) return 'text-green-600'
  if (m >= 0)  return 'text-yellow-600'
  return 'text-red-600'
}

const COLS: { key: SortCol; label: string; align: string }[] = [
  { key: 'drug_name', label: 'ชื่อยา',     align: 'text-left' },
  { key: 'qty_sold',  label: 'จำนวนขาย',  align: 'text-right' },
  { key: 'revenue',   label: 'รายได้',     align: 'text-right' },
  { key: 'cost',      label: 'ต้นทุน',     align: 'text-right' },
  { key: 'profit',    label: 'กำไร',       align: 'text-right' },
  { key: 'margin',    label: 'Margin %',   align: 'text-right' },
]

export default function ProfitPage() {
  const [from, setFrom] = useState(monthStartStr)
  const [to, setTo]     = useState(todayStr)
  const [report, setReport] = useState<ProfitReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [sortCol, setSortCol] = useState<SortCol>('profit')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const showToast = useToast()

  const fetch = async (f = from, t = to) => {
    setLoading(true)
    try { setReport(await getProfitReport(f, t)) }
    catch (e: unknown) { showToast((e as Error).message, 'error') }
    finally { setLoading(false) }
  }

  const applyPreset = (getRange: () => [string, string]) => {
    const [f, t] = getRange()
    setFrom(f)
    setTo(t)
    fetch(f, t)
  }

  const handleSort = (col: SortCol) => {
    if (col === sortCol) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('desc')
    }
  }

  const sorted = report
    ? [...report.by_drug].sort((a, b) => {
        const av = a[sortCol]
        const bv = b[sortCol]
        const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number)
        return sortDir === 'asc' ? cmp : -cmp
      })
    : []

  const noCostCount = report
    ? report.by_drug.filter(d => d.cost === 0 && d.revenue > 0).length
    : 0

  const s = report?.summary

  return (
    <div className="p-6">
      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
          />
          <span className="text-gray-400 text-sm">ถึง</span>
          <input
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>

        <div className="flex gap-1.5">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => applyPreset(p.getRange)}
              className="px-3 py-1.5 rounded-lg text-xs border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex gap-2">
          {report && (
            <Button
              variant="secondary"
              onClick={() => exportProfitXlsx(report, from, to)}
              className="border-green-300 text-green-700 hover:bg-green-50"
            >
              Excel
            </Button>
          )}
          <Button onClick={() => fetch()} disabled={loading}>
            {loading ? 'กำลังโหลด…' : 'ดูรายงาน'}
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      {s && (
        <div className="grid grid-cols-4 gap-4 mb-5">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-xs text-gray-500 mb-1">รายได้รวม</div>
            <div className="text-xl font-bold text-blue-600">{fmtMoney(s.revenue)}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.bills} บิล</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-xs text-gray-500 mb-1">ต้นทุนรวม</div>
            <div className="text-xl font-bold text-orange-500">{fmtMoney(s.cost)}</div>
            <div className="text-xs text-gray-400 mt-0.5">บาท</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-xs text-gray-500 mb-1">กำไรสุทธิ</div>
            <div className={`text-xl font-bold ${s.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {fmtMoney(s.profit)}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">บาท</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-xs text-gray-500 mb-1">Margin</div>
            <div className={`text-xl font-bold ${marginColor(s.margin)}`}>
              {s.margin.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-400 mt-0.5">กำไร / รายได้</div>
          </div>
        </div>
      )}

      {/* Warning badge */}
      {noCostCount > 0 && (
        <div className="mb-4 flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2.5 text-sm text-yellow-700">
          <span>⚠️</span>
          <span>มี <strong>{noCostCount}</strong> รายการยาที่ไม่มีราคาทุน — กำไรอาจแสดงผลไม่ถูกต้อง</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100">
        {loading ? (
          <div className="py-16"><Spinner /></div>
        ) : !report ? (
          <div className="py-16 text-center text-gray-400 text-sm">เลือกช่วงวันที่แล้วกด "ดูรายงาน"</div>
        ) : sorted.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">ไม่พบข้อมูลการขายในช่วงนี้</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {COLS.map(c => (
                  <th
                    key={c.key}
                    onClick={() => handleSort(c.key)}
                    className={`py-3 px-4 text-xs font-semibold text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700 ${c.align}`}
                  >
                    {c.label}
                    {sortCol === c.key && (
                      <span className="ml-1 text-blue-500">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(d => (
                <tr key={d.drug_id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2.5 px-4 font-medium text-gray-800">{d.drug_name}</td>
                  <td className="py-2.5 px-4 text-right text-gray-600">{d.qty_sold.toLocaleString()}</td>
                  <td className="py-2.5 px-4 text-right text-gray-700">{fmtMoney(d.revenue)}</td>
                  <td className="py-2.5 px-4 text-right text-gray-500">{fmtMoney(d.cost)}</td>
                  <td className={`py-2.5 px-4 text-right font-semibold ${d.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {fmtMoney(d.profit)}
                  </td>
                  <td className={`py-2.5 px-4 text-right font-medium ${marginColor(d.margin)}`}>
                    {d.margin.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
