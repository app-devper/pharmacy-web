import { Drug, getDrugSellPrice } from '../../types/drug'
import { DEFAULT_LOW_STOCK_THRESHOLD } from '../ui/Badge'
import { useSettings } from '../../context/SettingsContext'

interface Props {
  drugs: Drug[]
}

const fmtBaht = (n: number) =>
  `฿${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`

export default function StockMetrics({ drugs }: Props) {
  const { settings } = useSettings()
  const tenantThreshold = settings.stock.low_stock_threshold
  const fallback = tenantThreshold === undefined ? DEFAULT_LOW_STOCK_THRESHOLD : tenantThreshold
  const total = drugs.length
  const outStock = drugs.filter(d => d.stock === 0).length
  // low-stock = stock in (0, threshold]; threshold=0 = "disabled".
  const lowStock = drugs.filter(d => {
    const threshold = d.min_stock && d.min_stock > 0 ? d.min_stock : fallback
    return threshold > 0 && d.stock > 0 && d.stock <= threshold
  }).length
  // Match report.go calcStockValue: sum(cost_price × stock)
  const costValue = drugs.reduce((s, d) => s + (d.cost_price || 0) * d.stock, 0)
  const sellValue = drugs.reduce((s, d) => s + getDrugSellPrice(d) * d.stock, 0)

  const cards = [
    { label: 'รายการทั้งหมด', value: total.toString(), sub: '', color: 'text-blue-600' },
    { label: 'สินค้าหมด',     value: outStock.toString(), sub: '', color: 'text-red-600' },
    { label: 'ใกล้หมด',        value: lowStock.toString(), sub: '', color: 'text-amber-600' },
    { label: 'มูลค่าสต็อก (ต้นทุน)', value: fmtBaht(costValue), sub: '', color: 'text-green-600' },
    { label: 'มูลค่าสต็อก (ราคาขาย)', value: fmtBaht(sellValue), sub: `กำไรคาดการณ์ ${fmtBaht(sellValue - costValue)}`, color: 'text-purple-600' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
      {cards.map(c => (
        <div key={c.label} className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-xs text-gray-500 mb-1">{c.label}</div>
          <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
          {c.sub && <div className="text-xs text-gray-400 mt-0.5">{c.sub}</div>}
        </div>
      ))}
    </div>
  )
}
