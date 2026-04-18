import { ReportSummary } from '../../types/report'

interface Props {
  summary: ReportSummary
  monthProfit?: number
}

export default function ReportMetrics({ summary, monthProfit }: Props) {
  const hasRealProfit = monthProfit !== undefined
  const profit = hasRealProfit ? monthProfit : summary.month_sales * 0.3
  const cards = [
    { label: 'ยอดขายวันนี้', value: `฿${summary.today_sales.toLocaleString()}`, sub: `${summary.today_bills} รายการ`, color: 'text-blue-600' },
    { label: 'ยอดขายเดือนนี้', value: `฿${summary.month_sales.toLocaleString()}`, sub: 'บาท', color: 'text-indigo-600' },
    { label: hasRealProfit ? 'กำไรเดือนนี้' : 'กำไรโดยประมาณ', value: `฿${profit.toLocaleString()}`, sub: hasRealProfit ? 'รายได้ - ต้นทุน' : 'ประมาณ 30%', color: profit >= 0 ? 'text-green-600' : 'text-red-600' },
    { label: 'มูลค่าสต็อก (ต้นทุน)', value: `฿${summary.stock_value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, sub: `หมด ${summary.out_stock} / ใกล้หมด ${summary.low_stock}`, color: 'text-purple-600' },
  ]

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {cards.map(c => (
        <div key={c.label} className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-xs text-gray-500 mb-1">{c.label}</div>
          <div className={`text-xl font-bold ${c.color}`}>{c.value}</div>
          <div className="text-xs text-gray-400 mt-0.5">{c.sub}</div>
        </div>
      ))}
    </div>
  )
}
