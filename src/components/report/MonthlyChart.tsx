import { useState, useEffect } from 'react'
import {
  ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { MonthlyData } from '../../types/report'
import { getMonthly } from '../../api/report'
import { useToast } from '../../hooks/useToast'
import { fmtK, shortMonth } from '../../utils/formatters'
import Spinner from '../ui/Spinner'

interface Props {
  data?: MonthlyData[]  // if provided, skip internal fetch
}

const CHART_LABELS: Record<string, string> = { revenue: 'รายได้', cost: 'ต้นทุน', profit: 'กำไร' }

export default function MonthlyChart({ data: propData }: Props) {
  const showToast = useToast()
  const [data, setData]       = useState<MonthlyData[]>(propData ?? [])
  const [loading, setLoading] = useState(propData === undefined)

  useEffect(() => {
    if (propData !== undefined) return  // parent owns the data
    let mounted = true
    setLoading(true)
    getMonthly(12)
      .then(d  => { if (mounted) setData(d) })
      .catch(e => { if (mounted) showToast((e as Error).message, 'error') })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [propData, showToast])

  // Sync when parent passes updated data
  useEffect(() => {
    if (propData !== undefined) { setData(propData); setLoading(false) }
  }, [propData])

  const chartData = data.map(d => ({ ...d, label: shortMonth(d.month) }))

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">รายได้ vs ต้นทุน 12 เดือนล่าสุด</h3>
      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : data.length === 0 ? (
        <div className="flex justify-center items-center py-12 text-gray-400 text-sm">ยังไม่มีข้อมูล</div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={fmtK} />
            <Tooltip
              formatter={(value, name) => {
                const key = String(name)
                return [`฿${Number(value).toLocaleString()}`, CHART_LABELS[key] ?? key]
              }}
              labelFormatter={l => `เดือน ${l}`}
            />
            <Legend formatter={v => CHART_LABELS[v] ?? v} />
            <Bar dataKey="revenue" fill="#3b82f6" radius={[3, 3, 0, 0]} name="revenue" />
            <Bar dataKey="cost"    fill="#f97316" radius={[3, 3, 0, 0]} name="cost" />
            <Line
              type="monotone"
              dataKey="profit"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 3, fill: '#10b981' }}
              name="profit"
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
