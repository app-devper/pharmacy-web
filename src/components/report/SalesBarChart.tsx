import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { DailyData } from '../../types/report'
import { fmtK } from '../../utils/formatters'

interface Props {
  data: DailyData[]
  days: number
}

export default function SalesBarChart({ data, days }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">ยอดขาย {days} วันล่าสุด</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => v.slice(5)} />
          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={fmtK} />
          <Tooltip
            formatter={(v) => [`฿${Number(v).toLocaleString()}`, 'ยอดขาย']}
            labelFormatter={l => `วันที่ ${l}`}
          />
          <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
