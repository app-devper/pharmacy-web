import { useState, useEffect, useCallback } from 'react'
import { useDrugs } from '../../hooks/useDrugs'
import { getDrugSellPrice } from '../../types/drug'
import { createImport, updateImport, confirmImport, getImport } from '../../api/imports'
import { useSuppliers } from '../../hooks/useSuppliers'
import { useToast } from '../../hooks/useToast'
import type { POItemInput, POInput, POItem } from '../../types/import'
import Button from '../ui/Button'
import Spinner from '../ui/Spinner'
import { genLotNumber } from '../../utils/lot'

interface Props {
  existingId?: string   // set for edit mode
  onClose: () => void
  onSaved: () => void
}

const today = new Date().toISOString().split('T')[0]

function emptyRow(idx: number): POItemInput {
  const ymd = today.replace(/-/g, '').slice(2) // YYMMDD
  return {
    drug_id: '', drug_name: '', lot_number: `IMP-${ymd}-${String(idx + 1).padStart(3, '0')}`,
    expiry_date: '', qty: '', cost_price: '', sell_price: '',
  }
}

function toAPIItems(rows: POItemInput[]): POItem[] {
  return rows
    .filter(r => r.drug_id)
    .map(r => ({
      drug_id: r.drug_id,
      drug_name: r.drug_name,
      lot_number: r.lot_number,
      expiry_date: r.expiry_date,
      qty: parseInt(r.qty) || 0,
      cost_price: parseFloat(r.cost_price) || 0,
      sell_price: r.sell_price ? parseFloat(r.sell_price) : null,
    }))
}

export default function ImportFormModal({ existingId, onClose, onSaved }: Props) {
  const showToast = useToast()
  const { drugs } = useDrugs()

  const [header, setHeader] = useState({
    supplier: '', invoice_no: '', receive_date: today, notes: '',
  })
  const [rows, setRows] = useState<POItemInput[]>([emptyRow(0)])
  const [errors, setErrors] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState(false)
  const [loadingEdit, setLoadingEdit] = useState(!!existingId)
  const { suppliers } = useSuppliers()

  // Load existing PO for edit mode
  useEffect(() => {
    if (!existingId) return
    getImport(existingId).then(po => {
      setHeader({
        supplier: po.supplier,
        invoice_no: po.invoice_no,
        receive_date: po.receive_date ? po.receive_date.slice(0, 10) : today,
        notes: po.notes,
      })
      setRows(po.items.map(item => ({
        drug_id: item.drug_id,
        drug_name: item.drug_name,
        lot_number: item.lot_number,
        expiry_date: item.expiry_date,
        qty: String(item.qty),
        cost_price: String(item.cost_price),
        sell_price: item.sell_price != null ? String(item.sell_price) : '',
      })))
      setLoadingEdit(false)
    }).catch(e => {
      showToast((e as Error).message, 'error')
      setLoadingEdit(false)
    })
  }, [existingId])

  const setHeaderField = (k: string, v: string) => setHeader(h => ({ ...h, [k]: v }))

  const setRow = useCallback((idx: number, k: keyof POItemInput, v: string) => {
    setRows(prev => prev.map((r, i) => i !== idx ? r : { ...r, [k]: v }))
  }, [])

  const onDrugNameChange = useCallback((idx: number, value: string) => {
    const matched = drugs.find(d => d.name === value)
    setRows(prev => prev.map((row, i) => {
      if (i !== idx) return row
      return {
        ...row,
        drug_name: value,
        drug_id: matched?.id ?? '',
        cost_price: matched && !row.cost_price ? String(matched.cost_price) : row.cost_price,
        sell_price: matched && !row.sell_price && getDrugSellPrice(matched) !== matched.cost_price
          ? '' : row.sell_price,
      }
    }))
  }, [drugs])

  const addRow = () => setRows(prev => [...prev, emptyRow(prev.length)])

  const removeRow = (idx: number) =>
    setRows(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev)

  const validate = (): boolean => {
    const invalid = new Set<number>()
    rows.forEach((row, i) => {
      if (!row.drug_id || !row.lot_number || !row.expiry_date
        || !(parseInt(row.qty) > 0) || !(parseFloat(row.cost_price) >= 0)) {
        invalid.add(i)
      }
    })
    setErrors(invalid)
    return invalid.size === 0
  }

  const buildInput = (): POInput => ({
    supplier: header.supplier,
    invoice_no: header.invoice_no,
    receive_date: header.receive_date,
    notes: header.notes,
    items: toAPIItems(rows),
  })

  const handleSaveDraft = async () => {
    if (!header.supplier) { showToast('กรุณาระบุผู้ขาย', 'error'); return }
    setSaving(true)
    try {
      if (existingId) {
        await updateImport(existingId, buildInput())
      } else {
        await createImport(buildInput())
      }
      showToast('บันทึกแบบร่างสำเร็จ')
      onSaved()
    } catch (e: unknown) { showToast((e as Error).message, 'error') }
    finally { setSaving(false) }
  }

  const handleConfirm = async () => {
    if (!header.supplier) { showToast('กรุณาระบุผู้ขาย', 'error'); return }
    if (!validate()) { showToast('กรุณากรอกข้อมูลรายการให้ครบ', 'error'); return }

    const items = toAPIItems(rows)
    const totalCost = items.reduce((s, i) => s + i.qty * i.cost_price, 0)
    const totalQty = items.reduce((s, i) => s + i.qty, 0)

    if (!window.confirm(
      `ยืนยันการรับสินค้า?\n\nรายการ: ${items.length} รายการ  จำนวนรวม: ${totalQty} หน่วย\nมูลค่ารวม: ฿${totalCost.toLocaleString()}\n\nระบบจะเพิ่มสต็อกอัตโนมัติ`
    )) return

    setSaving(true)
    try {
      let poId = existingId
      if (!poId) {
        const created = await createImport(buildInput())
        poId = created.id
      } else {
        await updateImport(poId, buildInput())
      }
      await confirmImport(poId!)
      showToast(`รับสินค้าสำเร็จ ${items.length} รายการ`)
      onSaved()
    } catch (e: unknown) { showToast((e as Error).message, 'error') }
    finally { setSaving(false) }
  }

  const totalCost = rows.reduce((s, r) => s + (parseInt(r.qty) || 0) * (parseFloat(r.cost_price) || 0), 0)

  const inp = (label: string, key: string, type = 'text') => (
    <div key={key}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={(header as Record<string, string>)[key]}
        onChange={e => setHeaderField(key, e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
      />
    </div>
  )

  const title = existingId
    ? `แก้ไขใบนำเข้า`
    : 'สร้างใบนำเข้าสินค้า'

  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {loadingEdit ? (
          <div className="flex-1 flex items-center justify-center"><Spinner /></div>
        ) : (
          <>
            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              {/* Header info */}
              <div className="grid grid-cols-2 gap-3">
                {/* Supplier field with datalist autocomplete */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">ผู้ขาย / ซัพพลายเออร์ *</label>
                  <input
                    type="text"
                    list="supplier-datalist"
                    value={header.supplier}
                    onChange={e => setHeaderField('supplier', e.target.value)}
                    placeholder="พิมพ์หรือเลือกซัพพลายเออร์..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
                {inp('เลขที่ใบส่งของ', 'invoice_no')}
                {inp('วันที่รับสินค้า *', 'receive_date', 'date')}
                {inp('หมายเหตุ', 'notes')}
              </div>

              {/* Items table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700">รายการยา</h3>
                  <span className="text-xs text-gray-400">{rows.length} รายการ</span>
                </div>
                <div className="overflow-x-auto border border-gray-100 rounded-xl">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-2 px-3 text-xs text-gray-500 font-semibold w-8">#</th>
                        <th className="text-left py-2 px-3 text-xs text-gray-500 font-semibold min-w-[160px]">ชื่อยา *</th>
                        <th className="text-left py-2 px-3 text-xs text-gray-500 font-semibold min-w-[120px]">ล็อตหมายเลข *</th>
                        <th className="text-left py-2 px-3 text-xs text-gray-500 font-semibold min-w-[120px]">วันหมดอายุ *</th>
                        <th className="text-right py-2 px-3 text-xs text-gray-500 font-semibold w-20">จำนวน *</th>
                        <th className="text-right py-2 px-3 text-xs text-gray-500 font-semibold w-28">ราคาทุน/หน่วย *</th>
                        <th className="text-right py-2 px-3 text-xs text-gray-500 font-semibold w-28">ราคาขาย</th>
                        <th className="text-right py-2 px-3 text-xs text-gray-500 font-semibold w-24">รวม</th>
                        <th className="w-8 py-2 px-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => {
                        const hasError = errors.has(idx)
                        const lineTotal = (parseInt(row.qty) || 0) * (parseFloat(row.cost_price) || 0)
                        return (
                          <tr key={idx} className={`border-t border-gray-50 ${hasError ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                            <td className="px-3 py-1.5 text-gray-400 text-xs">{idx + 1}</td>
                            <td className="px-2 py-1.5">
                              <div className="relative">
                                <input
                                  type="text"
                                  list="import-drug-datalist"
                                  value={row.drug_name}
                                  onChange={e => onDrugNameChange(idx, e.target.value)}
                                  placeholder="พิมพ์ชื่อยา..."
                                  className={`w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400 ${hasError && !row.drug_id ? 'border-red-300' : 'border-gray-200'}`}
                                />
                                {row.drug_name && !row.drug_id && (
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-amber-500 text-xs">⚠</span>
                                )}
                              </div>
                            </td>
                            <td className="px-2 py-1.5">
                              <div className="flex gap-1">
                                <input
                                  type="text"
                                  value={row.lot_number}
                                  onChange={e => setRow(idx, 'lot_number', e.target.value)}
                                  placeholder="กรอกเอง หรือกด Gen"
                                  className={`flex-1 min-w-0 border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400 ${hasError && !row.lot_number ? 'border-red-300' : 'border-gray-200'}`}
                                />
                                <button
                                  type="button"
                                  onClick={() => setRow(idx, 'lot_number', genLotNumber('IMP'))}
                                  className="px-1.5 py-1 border border-gray-200 rounded-lg text-xs font-medium text-gray-400 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 transition-colors shrink-0"
                                  title="สร้างล็อตอัตโนมัติ"
                                >Gen</button>
                              </div>
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="date"
                                value={row.expiry_date}
                                onChange={e => setRow(idx, 'expiry_date', e.target.value)}
                                className={`w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400 ${hasError && !row.expiry_date ? 'border-red-300' : 'border-gray-200'}`}
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="number"
                                value={row.qty}
                                onChange={e => setRow(idx, 'qty', e.target.value)}
                                min={1}
                                placeholder="0"
                                className={`w-full border rounded-lg px-2 py-1.5 text-xs text-right focus:outline-none focus:border-blue-400 ${hasError && !(parseInt(row.qty) > 0) ? 'border-red-300' : 'border-gray-200'}`}
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="number"
                                value={row.cost_price}
                                onChange={e => setRow(idx, 'cost_price', e.target.value)}
                                min={0}
                                step="0.01"
                                placeholder="0.00"
                                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-right focus:outline-none focus:border-blue-400"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="number"
                                value={row.sell_price}
                                onChange={e => setRow(idx, 'sell_price', e.target.value)}
                                min={0}
                                step="0.01"
                                placeholder="—ค่าเริ่มต้น—"
                                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-right focus:outline-none focus:border-blue-400"
                              />
                            </td>
                            <td className="px-3 py-1.5 text-right text-xs font-medium text-gray-700">
                              {lineTotal > 0 ? `฿${lineTotal.toLocaleString()}` : '—'}
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              <button
                                onClick={() => removeRow(idx)}
                                className="text-gray-300 hover:text-red-500 text-lg leading-none transition-colors"
                                title="ลบรายการ"
                              >×</button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Add row */}
                <button
                  onClick={addRow}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                >
                  + เพิ่มรายการยา
                </button>

                {/* Total */}
                {totalCost > 0 && (
                  <div className="mt-3 text-right text-sm">
                    <span className="text-gray-500">มูลค่ารวม: </span>
                    <span className="font-bold text-gray-800 text-base">฿{totalCost.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 border-t border-gray-100 flex gap-2 shrink-0">
              <Button variant="secondary" onClick={onClose} className="w-24">ยกเลิก</Button>
              <div className="flex-1" />
              <Button variant="secondary" onClick={handleSaveDraft} disabled={saving}>
                {saving ? 'กำลังบันทึก...' : 'บันทึกแบบร่าง'}
              </Button>
              <Button onClick={handleConfirm} disabled={saving}>
                {saving ? 'กำลังยืนยัน...' : '✓ ยืนยันรับสินค้า'}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Drug datalist — single list for all rows */}
      <datalist id="import-drug-datalist">
        {drugs.map(d => (
          <option key={d.id} value={d.name} />
        ))}
      </datalist>

      {/* Supplier datalist */}
      <datalist id="supplier-datalist">
        {suppliers.map(s => (
          <option key={s.id} value={s.name} />
        ))}
      </datalist>
    </div>
  )
}
