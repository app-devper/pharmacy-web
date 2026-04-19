import { useState } from 'react'
import type { PriceTiers } from '../../types/drug'
import { getTierLabel } from '../../utils/pricing'
import TierPriceModal, { type TierPriceDraft } from './TierPriceModal'

/**
 * Editor for NON-RETAIL tier prices only (regular / wholesale / custom).
 * Retail ("หน้าร้าน") is the drug's base price and is managed by the parent
 * form's main price field — not shown as a row here.
 */
export interface TierDraft {
  name: string         // tier key (lowercase), never 'retail' in this editor
  priceStr: string
}

interface Props {
  /** Unit label shown in the modal title (e.g. "แผง"). */
  unit: string
  value: TierDraft[]
  onChange: (next: TierDraft[]) => void
  /** Read-only: hide add button, edit/×, and the hint line. Rows still render. */
  disabled?: boolean
}

/** Build the wire-format map from the editor rows PLUS a separately-provided retail value. */
export function draftsToPriceTiers(rows: TierDraft[], retail: number): PriceTiers {
  const out: PriceTiers = { retail: retail > 0 ? retail : 0 }
  for (const r of rows) {
    const key = r.name.trim().toLowerCase()
    if (!key || key === 'retail') continue
    const v = +r.priceStr || 0
    if (v <= 0) continue
    out[key] = v
  }
  return out
}

/**
 * Turn a stored PriceTiers map into ordered extra-tier rows.
 * Skips retail (handled by parent form) and skips zero/unset tiers so
 * legacy documents that stored `{retail, regular: 0, wholesale: 0}` don't
 * surface empty placeholder rows — users add what they need via the button.
 */
export function priceTiersToDrafts(p: PriceTiers | undefined): TierDraft[] {
  if (!p) return []
  const rows: TierDraft[] = []
  const ordered = ['regular', 'wholesale']
  for (const k of ordered) {
    const v = p[k]
    if (v !== undefined && v > 0) {
      rows.push({ name: k, priceStr: String(v) })
    }
  }
  for (const [k, v] of Object.entries(p)) {
    if (k === 'retail' || ordered.includes(k)) continue
    if (!v || v <= 0) continue
    rows.push({ name: k, priceStr: String(v) })
  }
  return rows
}

export default function PriceTiersEditor({ unit, value, onChange, disabled = false }: Props) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)

  const upsert = (row: TierPriceDraft, idx: number | null) => {
    if (idx === null) {
      onChange([...value, row])
    } else {
      onChange(value.map((r, i) => (i === idx ? row : r)))
    }
  }

  const removeAt = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx))
  }

  // `usedTiers` prevents adding a duplicate built-in. Include 'retail' so
  // nobody re-adds it here even though it's not shown as a row.
  const usedTiers = ['retail', ...value.map(r => r.name)]
  // All built-in non-retail tiers used → no more to add (no free-text custom).
  const BUILTIN_NON_RETAIL = ['regular', 'wholesale']
  const allUsed = BUILTIN_NON_RETAIL.every(k => usedTiers.includes(k))

  return (
    <div className="space-y-2">
      {value.length === 0 && (
        <div className="px-3 py-2.5 rounded-lg border border-dashed border-gray-200 text-xs text-gray-400 text-center">
          ยังไม่มีราคาพิเศษ — ใช้ราคาหน้าร้านเป็นหลัก
        </div>
      )}
      {value.map((row, i) => {
        const priceNum = +row.priceStr || 0
        return (
          <div
            key={i}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-800">{getTierLabel(row.name)}</div>
              <div className="text-[11px] text-gray-400 font-mono">{row.name}</div>
            </div>
            <div className="text-sm font-semibold text-gray-800 tabular-nums">
              {priceNum > 0 ? `฿${priceNum.toLocaleString()}` : <span className="text-gray-300">ยังไม่ตั้ง</span>}
            </div>
            {!disabled && (
              <>
                <button
                  type="button"
                  onClick={() => setEditingIdx(i)}
                  className="text-xs px-2 py-1 rounded text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  แก้ไข
                </button>
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  aria-label={`ลบ tier ${row.name}`}
                  className="text-gray-400 hover:text-red-500 text-lg leading-none w-6 h-6 flex items-center justify-center"
                >×</button>
              </>
            )}
          </div>
        )
      })}

      {/* Add button — hidden in read-only mode */}
      {!disabled && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          disabled={allUsed}
          className="w-full px-3 py-2.5 rounded-lg border-2 border-dashed border-gray-200 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:text-gray-500 disabled:hover:bg-transparent"
        >
          {allUsed ? 'ครบทุกประเภทลูกค้าแล้ว' : '+ เพิ่มราคาขาย'}
        </button>
      )}

      {!disabled && (
        <p className="text-xs text-gray-400">
          เพิ่มราคาสำหรับลูกค้าประจำ / ขายส่ง / VIP ฯลฯ · เชื่อมกับลูกค้าในหน้า "ลูกค้า"
        </p>
      )}

      {editingIdx !== null && value[editingIdx] && (
        <TierPriceModal
          unit={unit}
          initial={value[editingIdx]}
          usedTiers={usedTiers}
          onSave={row => upsert(row, editingIdx)}
          onClose={() => setEditingIdx(null)}
        />
      )}
      {adding && (
        <TierPriceModal
          unit={unit}
          usedTiers={usedTiers}
          onSave={row => upsert(row, null)}
          onClose={() => setAdding(false)}
        />
      )}
    </div>
  )
}
