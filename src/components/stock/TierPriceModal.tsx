import { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { BUILTIN_TIERS } from '../../types/drug'
import { getTierLabel } from '../../utils/pricing'

/** Data returned to the parent when the user saves a row. */
export interface TierPriceDraft {
  name: string         // tier key, lowercased
  priceStr: string     // raw input so it round-trips cleanly
}

interface Props {
  /** Unit label shown in the title (e.g. "แผง", "กล่อง", "เม็ด"). */
  unit: string
  /** Initial row when editing an existing tier. Omit → add mode. */
  initial?: TierPriceDraft
  /** Tier keys already used elsewhere on this drug — prevented from being reused. */
  usedTiers: string[]
  onSave: (row: TierPriceDraft) => void
  onClose: () => void
}

// Retail is not an option here — it's set separately as the drug's base price.
const BUILTIN_OPTIONS = [
  { key: 'regular',   label: 'ลูกค้าประจำ' },
  { key: 'wholesale', label: 'ขายส่ง'      },
] as const

/**
 * Add/edit a single tier-price entry. Tier options mirror customer types
 * (ประเภทลูกค้าของลูกค้า) — no free-text custom tier.
 */
export default function TierPriceModal({ unit, initial, usedTiers, onSave, onClose }: Props) {
  const editing = !!initial
  const initialIsBuiltin = !initial || (BUILTIN_TIERS as readonly string[]).includes(initial.name)

  // Which dropdown option is active. Empty string = no selection yet —
  // user must pick explicitly when adding a new tier (no implicit default).
  const [tierKey, setTierKey] = useState<string>(
    initial && initialIsBuiltin ? initial.name : ''
  )
  const [priceStr, setPriceStr] = useState(initial?.priceStr ?? '')

  // Legacy custom tiers (vip/staff/etc.) saved before this change — lock
  // the name so the existing row stays editable (price-only) without letting
  // users create new custom entries here.
  const lockName = editing && !initialIsBuiltin

  const name = lockName ? initial!.name : tierKey
  const conflict = !!name && !editing && usedTiers.includes(name)
  const priceNum = +priceStr || 0
  const canSave = !!name && priceNum > 0 && !conflict

  const handleSave = () => {
    if (!canSave) return
    onSave({ name, priceStr })
    onClose()
  }

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400'

  return (
    <Modal title={`ราคาขาย "${unit}"`} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* ผูกกับประเภทลูกค้า */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">ผูกกับประเภทลูกค้า</label>
            {lockName ? (
              <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700">
                {getTierLabel(initial!.name)}
                <span className="ml-1 text-[10px] text-gray-400">({initial!.name})</span>
              </div>
            ) : (
              <select
                value={tierKey}
                onChange={e => setTierKey(e.target.value)}
                className={inputCls}
                disabled={editing && initialIsBuiltin}
              >
                {!editing && <option value="" disabled>— เลือกประเภทลูกค้า —</option>}
                {BUILTIN_OPTIONS.map(o => (
                  <option key={o.key} value={o.key}
                    disabled={!editing && usedTiers.includes(o.key)}
                  >
                    {o.label}{!editing && usedTiers.includes(o.key) ? ' (มีอยู่แล้ว)' : ''}
                  </option>
                ))}
              </select>
            )}
            {conflict && (
              <p className="text-xs text-red-500 mt-1">tier "{name}" มีอยู่แล้ว</p>
            )}
          </div>

          {/* ราคาขายต่อหน่วย */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">ราคาขายต่อหน่วย</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={priceStr}
              onChange={e => setPriceStr(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && canSave) handleSave() }}
              placeholder="0.00"
              className={inputCls}
              autoFocus={!!editing}
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2 justify-end">
          <Button variant="secondary" onClick={onClose}>ยกเลิก</Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {editing ? 'บันทึก' : 'เพิ่ม'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
