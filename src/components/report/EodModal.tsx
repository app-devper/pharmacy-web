import { useState, useEffect } from 'react'
import type { EodReport } from '../../types/report'
import { getEod } from '../../api/report'
import { exportEodXlsx } from '../../utils/exportXlsx'
import { exportEodPdf } from '../../utils/exportPdf'
import Button from '../ui/Button'
import Spinner from '../ui/Spinner'

interface Props { onClose: () => void }

function MetricCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-gray-50'}`}>
      <p className={`text-xs mb-0.5 ${highlight ? 'text-blue-500' : 'text-gray-500'}`}>{label}</p>
      <p className={`font-semibold text-sm ${highlight ? 'text-blue-700' : 'text-gray-800'}`}>{value}</p>
    </div>
  )
}

export default function EodModal({ onClose }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [report, setReport] = useState<EodReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [actual, setActual] = useState('')

  useEffect(() => {
    setLoading(true)
    setReport(null)
    getEod(date)
      .then(setReport)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [date])

  const diff = report && actual !== ''
    ? (parseFloat(actual) || 0) - report.net_cash
    : null

  const diffColor = diff === null ? '' : diff === 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-amber-600'
  const diffLabel = diff === null ? '' : diff === 0 ? 'ตรงกัน ✓' : diff < 0 ? `ขาด ฿${Math.abs(diff).toLocaleString('th-TH')}` : `เกิน ฿${Math.abs(diff).toLocaleString('th-TH')}`

  const fmt = (n: number) => `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">ปิดรอบประจำวัน</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {/* Date picker */}
          <div className="flex items-center gap-3 mb-4">
            <label className="text-sm font-medium text-gray-600 whitespace-nowrap">เลือกวันที่</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>

          {loading && <Spinner />}

          {!loading && report && (
            <>
              {/* Metrics grid */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <MetricCard label="จำนวนบิล" value={`${report.bill_count} ใบ`} />
                <MetricCard label="ยอดขายรวม" value={fmt(report.total_sales)} />
                <MetricCard label="ส่วนลดรวม" value={fmt(report.total_discount)} />
                <MetricCard label="รับเงินรวม" value={fmt(report.total_received)} />
                <MetricCard label="เงินทอนรวม" value={fmt(report.total_change)} />
                <MetricCard label="เงินสดในลิ้นชัก (คาดการณ์)" value={fmt(report.net_cash)} highlight />
              </div>

              {/* Actual cash input */}
              <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">ยอดนับเงินจริง (฿)</label>
                <input
                  type="number"
                  value={actual}
                  onChange={e => setActual(e.target.value)}
                  placeholder="0.00"
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-36 text-right focus:outline-none focus:border-blue-400"
                />
                {diff !== null && (
                  <span className={`text-sm font-semibold ${diffColor}`}>{diffLabel}</span>
                )}
              </div>

              {/* Bills table */}
              {report.bills.length > 0 && (
                <div className="max-h-52 overflow-y-auto rounded-lg border border-gray-100 mb-4">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">เลขบิล</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">เวลา</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">ลูกค้า</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-600">ยอดขาย</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-600">รับเงิน</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-600">เงินทอน</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.bills.map(b => (
                        <tr key={b.id} className="border-t border-gray-50 hover:bg-gray-50">
                          <td className="px-3 py-1.5 font-mono">{b.bill_no}</td>
                          <td className="px-3 py-1.5 text-gray-500">
                            {new Date(b.sold_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-3 py-1.5">{b.customer_name || '-'}</td>
                          <td className="px-3 py-1.5 text-right">{b.total.toLocaleString('th-TH')}</td>
                          <td className="px-3 py-1.5 text-right">{b.received.toLocaleString('th-TH')}</td>
                          <td className="px-3 py-1.5 text-right">{b.change.toLocaleString('th-TH')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {report.bills.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4 mb-4">ไม่มีรายการขายในวันนี้</p>
              )}

              {/* Export + Close */}
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1 border-green-300 text-green-700 hover:bg-green-50"
                  onClick={() => exportEodXlsx(report)}
                >
                  Excel
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => exportEodPdf(report)}
                >
                  PDF
                </Button>
                <Button variant="secondary" className="flex-1" onClick={onClose}>ปิด</Button>
              </div>
            </>
          )}

          {!loading && !report && (
            <p className="text-sm text-gray-400 text-center py-8">ไม่สามารถโหลดข้อมูลได้</p>
          )}
        </div>
      </div>
    </div>
  )
}
