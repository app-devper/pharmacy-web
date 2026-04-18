import { useState, useRef, useEffect } from 'react'
import { Drug, AltUnit, getDrugSellPrice } from '../../types/drug'
import { TypeBadge, KyBadges } from '../ui/Badge'
import { useCart } from '../../context/CartContext'
import { resolvePrice } from '../../utils/pricing'

interface Props {
  drug: Drug
  /** altUnit = null → base unit (default behaviour). */
  onAdd: (drug: Drug, altUnit?: AltUnit | null) => void
  highlighted?: boolean
}

export default function DrugCard({ drug, onAdd, highlighted }: Props) {
  const { priceTier } = useCart()
  const oos = drug.stock === 0
  // Price displayed on the card + popover reflects the cart's current tier.
  const price = resolvePrice(getDrugSellPrice(drug), drug.prices, priceTier)
  const alts = drug.alt_units ?? []
  const hasAlts = alts.length > 0
  const [menuOpen, setMenuOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const h = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [menuOpen])

  const pick = (alt: AltUnit | null) => {
    setMenuOpen(false)
    onAdd(drug, alt)
  }

  const handleClick = () => {
    if (oos) return
    if (hasAlts) { setMenuOpen(v => !v); return }
    onAdd(drug, null)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={handleClick}
        disabled={oos}
        className={`w-full bg-white rounded-xl border p-3 text-left transition-all ${
          oos
            ? 'opacity-50 cursor-not-allowed border-gray-100'
            : highlighted
              ? 'shadow-md border-green-400 ring-2 ring-green-300 scale-[1.02]'
              : 'hover:shadow-md hover:border-blue-300 active:scale-95 border-gray-200'
        }`}
      >
        <div className="flex justify-between items-start gap-2 mb-0.5">
          <span className="text-sm font-medium text-gray-800 leading-tight">{drug.name}</span>
          {oos
            ? <span className="text-xs text-red-500 shrink-0">หมด</span>
            : hasAlts && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold shrink-0" aria-label={`มี ${alts.length} หน่วย`}>+{alts.length}</span>
          }
        </div>
        {drug.generic_name && (
          <span className="text-xs text-gray-400 block mb-1 leading-tight">{drug.generic_name}{drug.strength ? ` ${drug.strength}` : ''}</span>
        )}
        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
          <TypeBadge type={drug.type} />
          <KyBadges types={drug.report_types ?? []} />
        </div>
        <div className="flex justify-between items-end mt-1">
          <span className="text-blue-600 font-bold text-base">฿{price.toLocaleString()}</span>
          <span className="text-xs text-gray-400">คงเหลือ {drug.stock} {drug.unit}</span>
        </div>
      </button>

      {menuOpen && !oos && hasAlts && (
        <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
          <div className="px-3 py-1.5 text-[10px] uppercase text-gray-400 bg-gray-50 border-b border-gray-100">เลือกหน่วยที่ขาย</div>
          {/* Base unit */}
          <button
            type="button"
            onClick={e => { e.stopPropagation(); pick(null) }}
            className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-blue-50 transition-colors"
          >
            <span className="text-gray-800">{drug.unit}</span>
            <span className="font-semibold text-blue-600">฿{price.toLocaleString()}</span>
          </button>
          {alts.map(alt => {
            const altPrice = resolvePrice(alt.sell_price, alt.prices, priceTier)
            return (
              <button
                key={alt.name}
                type="button"
                onClick={e => { e.stopPropagation(); pick(alt) }}
                className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-blue-50 border-t border-gray-100 transition-colors"
              >
                <span className="text-gray-800">
                  {alt.name}
                  <span className="ml-1 text-xs text-gray-400">×{alt.factor} {drug.unit}</span>
                </span>
                <span className="font-semibold text-blue-600">฿{altPrice.toLocaleString()}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
