import { useSettings } from '../../context/SettingsContext'

interface StockBadgeProps {
  stock: number
  minStock?: number
}

/** Hard fallback if SettingsContext isn't available (e.g. outside app tree). */
export const DEFAULT_LOW_STOCK_THRESHOLD = 20

const badgeBase = 'inline-block px-2 py-0.5 text-xs rounded-full font-medium whitespace-nowrap'

export function StockBadge({ stock, minStock }: StockBadgeProps) {
  const { settings } = useSettings()
  // Use the tenant fallback when the drug has no min_stock. Treat
  // `undefined` as "not configured" → fall back to built-in constant;
  // `0` is an explicit choice meaning "never show ใกล้หมด".
  const tenantThreshold = settings.stock.low_stock_threshold
  const fallback = tenantThreshold === undefined ? DEFAULT_LOW_STOCK_THRESHOLD : tenantThreshold
  const threshold = minStock && minStock > 0 ? minStock : fallback
  if (stock === 0)
    return <span className={`${badgeBase} bg-red-100 text-red-700`}>หมด</span>
  if (threshold > 0 && stock <= threshold)
    return <span className={`${badgeBase} bg-amber-100 text-amber-700`}>ใกล้หมด</span>
  return <span className={`${badgeBase} bg-green-100 text-green-700`}>ปกติ</span>
}

interface TypeBadgeProps {
  type: string
}

const typeColors: Record<string, string> = {
  'ยาสามัญ': 'bg-blue-100 text-blue-700',
  'ยาแผนปัจจุบัน': 'bg-purple-100 text-purple-700',
  'ยาสมุนไพร': 'bg-emerald-100 text-emerald-700',
  'อาหารเสริม': 'bg-orange-100 text-orange-700',
}

export function TypeBadge({ type }: TypeBadgeProps) {
  const cls = typeColors[type] ?? 'bg-gray-100 text-gray-700'
  return <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${cls}`}>{type}</span>
}

// KY Report type badges
const kyColors: Record<string, string> = {
  ky9:  'bg-blue-50 text-blue-600 border border-blue-200',
  ky10: 'bg-purple-50 text-purple-600 border border-purple-200',
  ky11: 'bg-red-50 text-red-600 border border-red-200',
  ky12: 'bg-teal-50 text-teal-600 border border-teal-200',
}
const kyLabels: Record<string, string> = {
  ky9: 'ขย.9', ky10: 'ขย.10', ky11: 'ขย.11', ky12: 'ขย.12',
}

interface KyBadgesProps {
  types: string[]
}
export function KyBadges({ types }: KyBadgesProps) {
  if (!types || types.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1">
      {types.map(t => (
        <span key={t} className={`px-1.5 py-0.5 text-[10px] rounded font-semibold ${kyColors[t] ?? 'bg-gray-100 text-gray-500'}`}>
          {kyLabels[t] ?? t}
        </span>
      ))}
    </div>
  )
}
