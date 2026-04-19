import { useState } from 'react'
import type { AltUnit } from '../../types/drug'
import AltUnitForm from './AltUnitForm'
import type { TierDraft } from './PriceTiersEditor'

/**
 * Draft rows use strings (matches <input value>) so users can type partial
 * numbers without losing focus. Normalised to AltUnit[] via validateAltUnits().
 */
export interface AltUnitDraft {
  name: string
  factor: string
  retail:    string           // alt-unit retail price
  extraTiers: TierDraft[]     // non-retail tier prices for this alt unit
  barcode:   string
  /** When true, this alt unit is hidden from the sell-page picker. */
  hidden:    boolean
}

interface Props {
  baseUnit: string
  value: AltUnitDraft[]
  onChange: (next: AltUnitDraft[]) => void
}

/** Validate and normalise draft rows. */
export function validateAltUnits(
  rows: AltUnitDraft[],
  baseUnit: string,
): { units: AltUnit[]; error?: undefined } | { error: string; units?: undefined } {
  const out: AltUnit[] = []
  const seen = new Set<string>()
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const name = r.name.trim()
    const hasAny = name || r.factor || r.retail || r.barcode || r.extraTiers.length > 0
    if (!hasAny) continue
    if (!name) return { error: `หน่วยทางเลือกแถว ${i + 1}: กรุณาระบุชื่อหน่วย` }
    if (name === baseUnit) return { error: `หน่วย "${name}" ซ้ำกับหน่วยหลัก` }
    if (seen.has(name)) return { error: `หน่วย "${name}" ซ้ำในอาร์เรย์` }
    seen.add(name)

    const factor = Math.floor(+r.factor || 0)
    if (factor < 2) return { error: `หน่วย "${name}": factor ต้อง >= 2` }

    const retail = +r.retail || 0
    if (retail < 0) return { error: `หน่วย "${name}": ราคาต้อง >= 0` }

    // Build prices map: retail + any positive extra tier (dedup, skip retail key).
    const prices: Record<string, number> = { retail }
    const seenTiers = new Set<string>(['retail'])
    for (const t of r.extraTiers) {
      const key = t.name.trim().toLowerCase()
      if (!key || seenTiers.has(key)) continue
      const v = +t.priceStr || 0
      if (v < 0) return { error: `หน่วย "${name}" tier "${key}": ราคาต้อง >= 0` }
      if (v === 0) continue
      prices[key] = v
      seenTiers.add(key)
    }

    const barcode = r.barcode.trim()
    out.push({
      name,
      factor,
      sell_price: retail, // mirror retail for backward compat
      prices,
      ...(barcode ? { barcode } : {}),
      ...(r.hidden ? { hidden: true } : {}),
    })
  }
  return { units: out }
}

export default function AltUnitsEditor({ baseUnit, value, onChange }: Props) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)

  const upsert = (row: AltUnitDraft, idx: number | null) => {
    if (idx === null) {
      onChange([...value, row])
    } else {
      onChange(value.map((r, i) => (i === idx ? row : r)))
    }
  }
  const removeAt = (idx: number) => {
    const row = value[idx]
    const label = row?.name?.trim() || `แถว ${idx + 1}`
    if (!confirm(`ลบหน่วย "${label}"? ข้อมูลราคาและบาร์โค้ดของหน่วยนี้จะหายด้วย`)) return
    onChange(value.filter((_, i) => i !== idx))
  }

  // `usedNames` excludes the currently-edited row so renaming it doesn't
  // trigger a false "duplicate" error against itself.
  const usedNamesFor = (skipIdx: number | null) =>
    value
      .map((r, i) => (i === skipIdx ? '' : r.name.trim()))
      .filter(Boolean)

  return (
    <div className="space-y-2">
      {value.map((row, i) => {
        const isEditing = editingIdx === i
        return (
          <AltUnitForm
            key={isEditing ? `edit-${i}` : `view-${i}`}
            baseUnit={baseUnit}
            initial={row}
            usedNames={usedNamesFor(i)}
            disabled={!isEditing}
            onSave={next => { upsert(next, i); setEditingIdx(null) }}
            onCancel={() => setEditingIdx(null)}
            onEdit={() => { setAdding(false); setEditingIdx(i) }}
            onRemove={() => removeAt(i)}
          />
        )
      })}

      {adding ? (
        <AltUnitForm
          baseUnit={baseUnit}
          usedNames={usedNamesFor(null)}
          onSave={next => { upsert(next, null); setAdding(false) }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => { setEditingIdx(null); setAdding(true) }}
          className="w-full px-3 py-2.5 rounded-lg border-2 border-dashed border-gray-200 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        >
          + เพิ่มหน่วยนับ
        </button>
      )}

      <p className="text-xs text-gray-400">
        หน่วยหลัก: <span className="font-medium">{baseUnit}</span> · เพิ่มหน่วยอื่น เช่น แผง / กล่อง — จะคำนวณ stock ต่อหน่วยหลักอัตโนมัติ
      </p>
    </div>
  )
}

