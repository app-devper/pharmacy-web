import { useState } from 'react'
import type { AltUnit } from '../../types/drug'

/**
 * Draft rows use strings (matches <input value>) so users can type partial
 * numbers without losing focus. Normalised to AltUnit[] via validateAltUnits().
 */
export interface AltUnitDraft {
  name: string
  factor: string
  retail:    string
  regular:   string
  wholesale: string
}

interface Props {
  baseUnit: string
  value: AltUnitDraft[]
  onChange: (next: AltUnitDraft[]) => void
}

/**
 * Validate and normalise draft rows. Returns either `{ units }` on success or
 * `{ error }` on the first issue found. Empty rows are skipped.
 */
export function validateAltUnits(
  rows: AltUnitDraft[],
  baseUnit: string,
): { units: AltUnit[]; error?: undefined } | { error: string; units?: undefined } {
  const out: AltUnit[] = []
  const seen = new Set<string>()
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const name = r.name.trim()
    if (!name && !r.factor && !r.retail && !r.regular && !r.wholesale) continue
    if (!name) return { error: `หน่วยทางเลือกแถว ${i + 1}: กรุณาระบุชื่อหน่วย` }
    if (name === baseUnit) return { error: `หน่วย "${name}" ซ้ำกับหน่วยหลัก` }
    if (seen.has(name)) return { error: `หน่วย "${name}" ซ้ำในอาร์เรย์` }
    seen.add(name)

    const factor = Math.floor(+r.factor || 0)
    if (factor < 2) return { error: `หน่วย "${name}": factor ต้อง >= 2` }

    const retail    = +r.retail    || 0
    const regular   = +r.regular   || 0
    const wholesale = +r.wholesale || 0
    if (retail < 0 || regular < 0 || wholesale < 0) {
      return { error: `หน่วย "${name}": ราคาต้อง >= 0` }
    }

    out.push({
      name,
      factor,
      sell_price: retail, // mirror retail for backward compat
      prices: { retail, regular, wholesale },
    })
  }
  return { units: out }
}

export default function AltUnitsEditor({ baseUnit, value, onChange }: Props) {
  const [expanded, setExpanded] = useState(value.length > 0)

  const addRow = () => {
    onChange([...value, { name: '', factor: '', retail: '', regular: '', wholesale: '' }])
    setExpanded(true)
  }
  const removeRow = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx))
  }
  const updateRow = (idx: number, key: keyof AltUnitDraft, v: string) => {
    onChange(value.map((r, i) => (i === idx ? { ...r, [key]: v } : r)))
  }

  const inputCls = 'w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400'

  return (
    <div className="border border-gray-200 rounded-lg bg-gray-50/60">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
      >
        <div>
          <span className="text-sm font-medium text-gray-700">หน่วยทางเลือก</span>
          <span className="ml-2 text-xs text-gray-400">
            (ไม่บังคับ — ตั้งราคา 3 tier ต่อหน่วย เช่น แผง / กล่อง)
          </span>
          {value.length > 0 && (
            <span className="ml-2 text-xs font-semibold text-indigo-600">· {value.length} รายการ</span>
          )}
        </div>
        <span className={`text-xs text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {value.length === 0 && (
            <p className="text-xs text-gray-400 italic">
              หน่วยหลัก: <span className="font-medium">{baseUnit}</span> — กด "+ เพิ่มหน่วย" เพื่อเพิ่มหน่วยทางเลือก
            </p>
          )}
          {value.length > 0 && (
            <div className="grid grid-cols-[1fr_56px_72px_72px_72px_28px] gap-1.5 text-[10px] text-gray-400">
              <div>ชื่อ</div>
              <div className="text-right">× {baseUnit}</div>
              <div className="text-right">หน้าร้าน</div>
              <div className="text-right">ประจำ</div>
              <div className="text-right">ขายส่ง</div>
              <div />
            </div>
          )}
          {value.map((row, i) => (
            <div key={i} className="grid grid-cols-[1fr_56px_72px_72px_72px_28px] gap-1.5 items-center">
              <input
                type="text"
                value={row.name}
                onChange={e => updateRow(i, 'name', e.target.value)}
                placeholder="แผง"
                className={inputCls}
              />
              <input
                type="number" min="2" step="1"
                value={row.factor}
                onChange={e => updateRow(i, 'factor', e.target.value)}
                placeholder="10"
                className={`${inputCls} text-right`}
              />
              <input
                type="number" min="0" step="0.01"
                value={row.retail}
                onChange={e => updateRow(i, 'retail', e.target.value)}
                placeholder="0"
                className={`${inputCls} text-right`}
              />
              <input
                type="number" min="0" step="0.01"
                value={row.regular}
                onChange={e => updateRow(i, 'regular', e.target.value)}
                placeholder="—"
                className={`${inputCls} text-right`}
              />
              <input
                type="number" min="0" step="0.01"
                value={row.wholesale}
                onChange={e => updateRow(i, 'wholesale', e.target.value)}
                placeholder="—"
                className={`${inputCls} text-right`}
              />
              <button
                type="button"
                onClick={() => removeRow(i)}
                aria-label="ลบหน่วย"
                className="text-gray-400 hover:text-red-500 text-lg leading-none"
              >×</button>
            </div>
          ))}
          <div className="flex items-center justify-end pt-1">
            <button
              type="button"
              onClick={addRow}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              + เพิ่มหน่วย
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
