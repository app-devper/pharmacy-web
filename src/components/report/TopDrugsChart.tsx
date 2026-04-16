import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import type { TopDrug } from '../../types/report'
import { getTopDrugs } from '../../api/report'
import { useToast } from '../../hooks/useToast'
import { fmtMoney } from '../../utils/formatters'
import DayPicker from '../ui/DayPicker'
import Spinner from '../ui/Spinner'

const DAY_OPTIONS = [7, 30, 90]

function truncate(s: string, n = 18) {
  return s.length > n ? s.slice(0, n) + '…' : s
}

export default function TopDrugsChart() {
  const showToast = useToast()
  const [days, setDays]       = useState(30)
  const [data, setData]       = useState<TopDrug[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    getTopDrugs(days)
      .then(d  => { if (mounted) setData(d) })
      .catch(e => { if (mounted) showToast((e as Error).message, 'error') })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [days, showToast])

  const chartData = [...data]
    .reverse()
    .map(d => ({ ...d, label: truncate(d.drug_name) }))

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">Top 10 ยาขายดี</h3>
        <DayPicker options={DAY_OPTIONS} value={days} onChange={setDays} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : data.length === 0 ? (
        <div className="flex justify-center items-center py-12 text-gray-400 text-sm">
          ยังไม่มีข้อมูลการขายในช่วงนี้
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 32)}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 48, bottom: 0, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickFormatter={v => `${v}`}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={130}
              tick={{ fontSize: 11, fill: '#374151' }}
            />
            <Tooltip
              formatter={(value, name) =>
                name === 'qty_sold'
                  ? [`${value} หน่วย`, 'จำนวนขาย']
                  : [fmtMoney(Number(value)), 'รายได้']
              }
              labelFormatter={(_l, payload) =>
                payload?.[0]?.payload?.drug_name ?? ''
              }
            />
            <Bar dataKey="qty_sold" fill="#6366f1" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11, fill: '#6b7280' }} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
