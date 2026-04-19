import { useState, useEffect } from 'react'
import Button from '../ui/Button'
import type { AltUnitDraft } from './AltUnitsEditor'
import PriceTiersEditor, { type TierDraft } from './PriceTiersEditor'

interface Props {
  /** Base unit label shown as reference (e.g. "เม็ด"). */
  baseUnit: string
  /** When set → edit/view mode; omit → add mode (always enabled). */
  initial?: AltUnitDraft
  /** Alt-unit names already used on this drug — prevents duplicates when adding. */
  usedNames: string[]
  /** When true, fields are read-only; bottom shows [แก้ไข] [×] instead of save/cancel. */
  disabled?: boolean
  onSave: (row: AltUnitDraft) => void
  onCancel: () => void
  /** Required when `disabled` — clicking "แก้ไข" in the read-only footer. */
  onEdit?: () => void
  /** Required when `disabled` — clicking "×" in the read-only footer. */
  onRemove?: () => void
}

/**
 * Inline add/edit form for a single alt unit. Two modes:
 * - **enabled** (default): editable form — use when adding or actively editing.
 * - **disabled**: read-only preview of a saved row, with [แก้ไข] [×] buttons.
 *
 * Replaces the previous modal-based AltUnitModal so the user can see the drug's
 * other fields while editing a unit. Container styling is provided here so the
 * block stands out (blue highlight) when editable and blends (gray) when locked.
 */
export default function AltUnitForm({
  baseUnit, initial, usedNames, disabled = false,
  onSave, onCancel, onEdit, onRemove,
}: Props) {
  const editing = !!initial
  const [name, setName] = useState(initial?.name ?? '')
  const [factorStr, setFactorStr] = useState(initial?.factor ?? '')
  const [retailStr, setRetailStr] = useState(initial?.retail ?? '')
  const [extraTiers, setExtraTiers] = useState<TierDraft[]>(initial?.extraTiers ?? [])
  const [barcode, setBarcode] = useState(initial?.barcode ?? '')
  const [showInSell, setShowInSell] = useState(initial ? !initial.hidden : true)

  // Keep local state in sync when `initial` changes — e.g. parent upserts or
  // user edits this row, cancels, then reopens. Without this the form keeps
  // showing stale state from the previous edit.
  useEffect(() => {
    setName(initial?.name ?? '')
    setFactorStr(initial?.factor ?? '')
    setRetailStr(initial?.retail ?? '')
    setExtraTiers(initial?.extraTiers ?? [])
    setBarcode(initial?.barcode ?? '')
    setShowInSell(initial ? !initial.hidden : true)
  }, [initial])

  const trimmedName = name.trim()
  const factorNum = Math.floor(+factorStr || 0)
  const retailNum = +retailStr || 0

  const conflict = !editing && !!trimmedName && usedNames.includes(trimmedName)
  const clashBase = !!trimmedName && trimmedName === baseUnit

  const canSave =
    !!trimmedName && !clashBase && !conflict && factorNum >= 2 && retailNum >= 0

  const handleSave = () => {
    if (!canSave) return
    onSave({
      name: trimmedName,
      factor: String(factorNum),
      retail: retailStr,
      extraTiers,
      barcode: barcode.trim(),
      hidden: !showInSell,
    })
  }

  const inputCls = `w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400 ${
    disabled ? 'bg-gray-50 text-gray-700 cursor-not-allowed' : 'bg-white'
  }`

  const containerCls = disabled
    ? `rounded-lg border border-gray-200 p-4 space-y-4 ${showInSell ? 'bg-white' : 'opacity-70'}`
    : 'rounded-lg border border-blue-200 bg-blue-50/40 p-4 space-y-4'

  return (
    <div className={containerCls}>
      <div className="flex items-baseline justify-between">
        <div className="text-xs font-semibold text-gray-700">
          {disabled
            ? (initial?.name?.trim() || 'หน่วยทางเลือก')
            : editing
              ? `แก้ไขหน่วยนับ "${initial!.name}"`
              : 'เพิ่มหน่วยนับ'}
        </div>
        <div className="text-[11px] text-gray-400">
          หน่วยหลัก: <span className="font-medium text-gray-600">{baseUnit}</span>
        </div>
      </div>

      {/* ชื่อหน่วย */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">ชื่อหน่วย *</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="เช่น แผง, กล่อง"
          className={inputCls}
          disabled={disabled}
          autoFocus={!editing && !disabled}
        />
        {!disabled && clashBase && <p className="text-xs text-red-500 mt-1">ซ้ำกับหน่วยหลัก</p>}
        {!disabled && conflict  && <p className="text-xs text-red-500 mt-1">หน่วย "{trimmedName}" มีอยู่แล้ว</p>}
      </div>

      {/* factor + ราคา */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            1 {trimmedName || 'หน่วย'} = กี่ {baseUnit} *
          </label>
          <input
            type="number"
            min="2"
            step="1"
            value={factorStr}
            onChange={e => setFactorStr(e.target.value)}
            placeholder="เช่น 10"
            className={`${inputCls} text-right`}
            disabled={disabled}
          />
          <p className="text-[10px] text-gray-400 mt-1">ขั้นต่ำ 2 (ถ้า 1 ใช้หน่วยหลักแทน)</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">ราคาขาย (฿) *</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={retailStr}
            onChange={e => setRetailStr(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !disabled && canSave) handleSave() }}
            placeholder="0.00"
            className={`${inputCls} text-right`}
            disabled={disabled}
          />
          {factorNum >= 2 && retailNum > 0 && (
            <p className="text-[10px] text-gray-400 mt-1 text-right">
              = ฿{(retailNum / factorNum).toLocaleString(undefined, { maximumFractionDigits: 2 })} / {baseUnit}
            </p>
          )}
        </div>
      </div>

      {/* Extra tier prices for this alt unit. When disabled, the editor
          renders rows only (add button + edit/× hidden via its `disabled` prop). */}
      {(!disabled || extraTiers.length > 0) && (
        <div>
          <div className="text-xs font-medium text-gray-600 mb-2">
            ราคาตามประเภทลูกค้าอื่น ๆ
            {!disabled && <span className="ml-1 text-gray-400 font-normal">(ไม่บังคับ)</span>}
          </div>
          <PriceTiersEditor
            unit={trimmedName || 'หน่วย'}
            value={extraTiers}
            onChange={setExtraTiers}
            disabled={disabled}
          />
        </div>
      )}

      {/* บาร์โค้ด */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          บาร์โค้ด {!disabled && <span className="text-gray-400 font-normal">(ไม่บังคับ)</span>}
        </label>
        <input
          type="text"
          value={barcode}
          onChange={e => setBarcode(e.target.value)}
          placeholder="สแกนหรือพิมพ์บาร์โค้ดของหน่วยนี้"
          className={inputCls}
          disabled={disabled}
        />
        {!disabled && (
          <p className="text-[10px] text-gray-400 mt-1">
            เมื่อสแกนบาร์โค้ดนี้ในหน้าขาย ระบบจะเลือกหน่วยนี้ให้อัตโนมัติ
          </p>
        )}
      </div>

      {/* แสดงในหน้าขาย */}
      <label className={`flex items-start gap-2 select-none ${disabled ? 'cursor-default' : 'cursor-pointer'}`}>
        <input
          type="checkbox"
          checked={showInSell}
          onChange={e => setShowInSell(e.target.checked)}
          className="accent-blue-600 mt-0.5"
          disabled={disabled}
        />
        <div>
          <div className="text-sm text-gray-700 font-medium">แสดงในหน้าขาย</div>
          {!disabled && (
            <div className="text-[10px] text-gray-400">
              ถ้าปิด จะไม่ขึ้นในตัวเลือกหน่วยตอนขาย แต่ข้อมูลยังคงบันทึกไว้
            </div>
          )}
        </div>
      </label>

      <div className="flex gap-2 pt-2 justify-end">
        {disabled ? (
          <>
            <button
              type="button"
              onClick={onRemove}
              aria-label={`ลบหน่วย ${initial?.name ?? ''}`}
              className="text-sm px-3 py-1.5 rounded text-gray-500 hover:text-red-500 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 transition-colors"
            >
              ลบ
            </button>
            <Button variant="secondary" onClick={onEdit}>แก้ไข</Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onCancel}>ยกเลิก</Button>
            <Button onClick={handleSave} disabled={!canSave}>
              {editing ? 'บันทึก' : 'เพิ่ม'}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
