import { Drug, getDrugSellPrice } from '../../types/drug'

interface Props {
  drugs: Drug[]
}

export default function StockMetrics({ drugs }: Props) {
  const total = drugs.length
  const outStock = drugs.filter(d => d.stock === 0).length
  const lowStock = drugs.filter(d => {
    const threshold = (d.min_stock && d.min_stock > 0) ? d.min_stock : 20
    return d.stock > 0 && d.stock <= threshold
  }).length
  const stockValue = drugs.reduce((s, d) => s + getDrugSellPrice(d) * d.stock, 0)

  const cards = [
    { label: 'รายการทั้งหมด', value: total.toString(), color: 'text-blue-600' },
    { label: 'สินค้าหมด', value: outStock.toString(), color: 'text-red-600' },
    { label: 'ใกล้หมด', value: lowStock.toString(), color: 'text-amber-600' },
    { label: 'มูลค่าสต็อก', value: `฿${stockValue.toLocaleString()}`, color: 'text-green-600' },
  ]

  return (
    <div className="grid grid-cols-4 gap-4 mb-4">
      {cards.map(c => (
        <div key={c.label} className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-xs text-gray-500 mb-1">{c.label}</div>
          <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
        </div>
      ))}
    </div>
  )
}
