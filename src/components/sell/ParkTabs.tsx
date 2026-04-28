import { useCart } from '../../context/CartContext'
import { useToast } from '../../hooks/useToast'
import { getDrugSellPrice } from '../../types/drug'
import { fmtMoney } from '../../utils/formatters'
import type { CartItem, ParkedSlot } from '../../types/sale'

function fmtTime(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function slotTotal(items: CartItem[]): number {
  return items.reduce((s, i) =>
    s + Math.max(0, getDrugSellPrice(i) - (i.itemDiscount || 0)) * i.qty, 0)
}

function slotQty(items: CartItem[]): number {
  return items.reduce((s, i) => s + i.qty, 0)
}

export default function ParkTabs() {
  const {
    items, total, selectedCustomer,
    activeSlot, slots, switchToSlot, discardSlot,
  } = useCart()
  const showToast = useToast()

  const handleSwitch = (idx: number) => {
    if (idx === activeSlot) return
    switchToSlot(idx)
    const target = slots[idx]
    if (target) {
      showToast(
        `บิล #${idx + 1}${target.customer ? ` — ${target.customer.name}` : ''}`,
        'success',
      )
    }
  }

  const handleDiscard = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation()
    const isActive = idx === activeSlot
    const hasContent = isActive ? items.length > 0 : slots[idx] !== null
    if (!hasContent) return
    const label = isActive
      ? (selectedCustomer?.name ?? `บิล #${idx + 1}`)
      : (slots[idx]?.customer?.name ?? `บิล #${idx + 1}`)
    if (window.confirm(`ล้างบิล "${label}"?`)) {
      discardSlot(idx)
      showToast(`ล้างบิล #${idx + 1}`, 'success')
    }
  }

  return (
    <div className="w-12 bg-white border-l border-gray-100 flex flex-col shrink-0">
      {Array.from({ length: 5 }, (_, i) => {
        const isActive = i === activeSlot
        const snap: ParkedSlot | null = isActive ? null : slots[i]
        const hasItems = isActive ? items.length > 0 : snap !== null
        const displayItems  = isActive ? items       : (snap?.items ?? [])
        const displayTotal  = isActive ? total       : slotTotal(snap?.items ?? [])

        // Tooltip content for filled inactive tabs
        const tooltip = hasItems && !isActive && snap
          ? `${slotQty(snap.items)} รายการ · ${fmtMoney(displayTotal)}${snap.customer ? ` · ${snap.customer.name}` : ''} · ${fmtTime(snap.parkedAt)}`
          : undefined

        return (
          <button
            key={i}
            type="button"
            onClick={() => handleSwitch(i)}
            title={tooltip}
            className={[
              'group relative flex-1 flex flex-col items-center justify-center border-b border-gray-100 transition-all select-none',
              isActive
                ? 'bg-indigo-50 cursor-default'
                : 'bg-white hover:bg-gray-50 cursor-pointer',
            ].join(' ')}
          >
            {/* Active left-border indicator (ชี้เข้าหาตะกร้า) */}
            {isActive && (
              <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-indigo-500 rounded-r-full" />
            )}

            {/* Tab number */}
            <span className={[
              'text-base font-semibold leading-none transition-colors',
              isActive
                ? 'text-indigo-600'
                : hasItems
                  ? 'text-gray-600'
                  : 'text-gray-300',
            ].join(' ')}>
              {i + 1}
            </span>

            {/* Filled indicator dot (inactive tabs with items) */}
            {hasItems && !isActive && (
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400" />
            )}

            {/* Active tab: small item count below number */}
            {isActive && hasItems && (
              <span className="mt-1 text-[10px] text-indigo-400 font-medium leading-none">
                {slotQty(displayItems)}
              </span>
            )}

            {/* Discard × — hover only, only when has content */}
            {hasItems && (
              <span
                role="button"
                onClick={(e) => handleDiscard(e, i)}
                className={[
                  'absolute top-0.5 right-0.5 w-4 h-4 rounded-full text-xs leading-none',
                  'flex items-center justify-center transition-all',
                  'opacity-0 group-hover:opacity-100',
                  isActive
                    ? 'text-indigo-300 hover:bg-red-500 hover:text-white'
                    : 'text-gray-300 hover:bg-red-500 hover:text-white',
                ].join(' ')}
              >
                ×
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
