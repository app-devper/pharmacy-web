import { useState, useEffect } from 'react'
import { getAdjustments } from '../../api/stockAdjustments'
import { useToast } from '../../hooks/useToast'
import { fmtDate } from '../../utils/formatters'
import type { Drug } from '../../types/drug'
import type { StockAdjustment } from '../../types/stockAdjustment'
import Spinner from '../ui/Spinner'

interface Props {
  drug: Drug
  onClose: () => void
}

export default function AdjustmentLogModal({ drug, onClose }: Props) {
  const showToast = useToast()
  const [log, setLog]         = useState<StockAdjustment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    getAdjustments(drug.id)
      .then(data  => { if (mounted) setLog(data) })
      .catch(e    => { if (mounted) showToast((e as Error).message, 'error') })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [drug.id, showToast])

  return (
    <div
      className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-800">ประวัติการปรับสต็อก</h2>
            <div className="text-xs text-gray-500 mt-0.5">
              {drug.name}
              <span className="mx-2 text-gray-300">|</span>
              สต็อกปัจจุบัน: <span className="font-semibold text-gray-700">{drug.stock} {drug.unit}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none ml-4"
          >×</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Spinner /></div>
          ) : log.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
              <span className="text-3xl">📋</span>
              <span className="text-sm">ยังไม่มีประวัติการปรับสต็อก</span>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className="text-left pb-2 text-xs text-gray-500 font-semibold">วันที่/เวลา</th>
                  <th className="text-left pb-2 text-xs text-gray-500 font-semibold">เหตุผล</th>
                  <th className="text-right pb-2 text-xs text-gray-500 font-semibold">ปรับ</th>
                  <th className="text-right pb-2 text-xs text-gray-500 font-semibold">ก่อน</th>
                  <th className="text-right pb-2 text-xs text-gray-500 font-semibold">หลัง</th>
                  <th className="text-left pb-2 text-xs text-gray-500 font-semibold pl-4">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {log.map(entry => (
                  <tr key={entry.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 text-xs text-gray-500 whitespace-nowrap">
                      {fmtDate(entry.created_at)}{' '}
                      <span className="text-gray-400">
                        {new Date(entry.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                        {entry.reason}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-semibold">
                      <span className={entry.delta > 0 ? 'text-green-600' : 'text-red-600'}>
                        {entry.delta > 0 ? '+' : ''}{entry.delta}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-gray-500">{entry.before}</td>
                    <td className="py-2.5 text-right font-medium text-gray-800">{entry.after}</td>
                    <td className="py-2.5 text-xs text-gray-400 pl-4 max-w-[160px] truncate">
                      {entry.note || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
