import { useState, useEffect } from 'react'
import type { SlowDrug } from '../../types/report'
import { getSlowDrugs } from '../../api/report'
import { useToast } from '../../hooks/useToast'
import DayPicker from '../ui/DayPicker'
import Spinner from '../ui/Spinner'

const DAY_OPTIONS = [30, 90, 180]

function stockBadgeClass(stock: number) {
  if (stock > 50) return 'bg-red-100 text-red-700'
  if (stock >= 10) return 'bg-yellow-100 text-yellow-700'
  return 'bg-gray-100 text-gray-600'
}

export default function SlowDrugsTable() {
  const showToast = useToast()
  const [days, setDays]       = useState(90)
  const [data, setData]       = useState<SlowDrug[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    getSlowDrugs(days)
      .then(d  => { if (mounted) setData(d) })
      .catch(e => { if (mounted) showToast((e as Error).message, 'error') })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [days, showToast])

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">ยาขายไม่ออก</h3>
        <DayPicker options={DAY_OPTIONS} value={days} onChange={setDays} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-green-600">
          <span className="text-2xl">🎉</span>
          <span className="text-sm font-medium">ยาทุกตัวมียอดขายใน {days} วันนี้</span>
        </div>
      ) : (
        <div className="overflow-y-auto max-h-[320px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">ชื่อยา</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">คงเหลือ</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">หน่วย</th>
              </tr>
            </thead>
            <tbody>
              {data.map(d => (
                <tr key={d.drug_id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="py-2 px-3 text-gray-800">{d.drug_name}</td>
                  <td className="py-2 px-3 text-right">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${stockBadgeClass(d.stock)}`}>
                      {d.stock}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-gray-400 text-xs">{d.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
