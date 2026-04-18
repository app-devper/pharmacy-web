import { useEffect, useMemo, useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Spinner from '../ui/Spinner'
import { getReorderSuggestions } from '../../api/drugs'
import { createImport } from '../../api/imports'
import { useToast } from '../../hooks/useToast'
import { useSettings } from '../../context/SettingsContext'
import type { ReorderSuggestion } from '../../types/drug'

interface Props {
  onClose: () => void
  onCreated?: () => void
}

const DAYS_PRESETS = [7, 14, 30, 60, 90]
const LOOKAHEAD_PRESETS = [7, 14, 30, 60]

function formatDaysLeft(d: number): string {
  if (!isFinite(d) || d >= 9999) return '—'
  if (d < 1) return '< 1 วัน'
  return `${Math.floor(d).toLocaleString()} วัน`
}

export default function ReorderSuggestionsModal({ onClose, onCreated }: Props) {
  const showToast = useToast()
  const { settings } = useSettings()
  // Seed from tenant config; user can still override from the dropdowns.
  const [days, setDays] = useState(settings.stock.reorder_days || 30)
  const [lookahead, setLookahead] = useState(settings.stock.reorder_lookahead || 14)
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<ReorderSuggestion[]>([])
  // per-drug overrides: selected state + adjusted qty
  const [picks, setPicks] = useState<Record<string, { selected: boolean; qty: number }>>({})
  const [supplier, setSupplier] = useState('')
  const [invoiceNo, setInvoiceNo] = useState('')
  const [saving, setSaving] = useState(false)

  // Load suggestions when days/lookahead change
  useEffect(() => {
    let mounted = true
    setLoading(true)
    getReorderSuggestions(days, lookahead)
      .then(data => {
        if (!mounted) return
        setItems(data)
        // Default selections: suggested_qty > 0 and stock low
        const defaults: Record<string, { selected: boolean; qty: number }> = {}
        for (const s of data) {
          defaults[s.drug_id] = {
            selected: s.suggested_qty > 0,
            qty: Math.max(1, s.suggested_qty || 0),
          }
        }
        setPicks(defaults)
      })
      .catch(e => { if (mounted) showToast((e as Error).message, 'error') })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [days, lookahead, showToast])

  const selectedIds = useMemo(
    () => Object.entries(picks).filter(([, v]) => v.selected).map(([k]) => k),
    [picks]
  )
  const selectedCount = selectedIds.length
  const estimatedCost = useMemo(
    () => items.reduce((sum, s) => {
      const p = picks[s.drug_id]
      if (!p?.selected) return sum
      return sum + (p.qty || 0) * s.cost_price
    }, 0),
    [items, picks]
  )

  const toggleAll = (val: boolean) => {
    setPicks(prev => {
      const next = { ...prev }
      for (const s of items) {
        next[s.drug_id] = { ...(next[s.drug_id] ?? { qty: s.suggested_qty || 1 }), selected: val }
      }
      return next
    })
  }

  const setQty = (drugId: string, qty: number) => {
    setPicks(prev => ({
      ...prev,
      [drugId]: { ...(prev[drugId] ?? { selected: true, qty: 0 }), qty: Math.max(0, qty) },
    }))
  }

  const setSelected = (drugId: string, selected: boolean) => {
    setPicks(prev => ({
      ...prev,
      [drugId]: { ...(prev[drugId] ?? { qty: 1 }), selected },
    }))
  }

  const handleCreate = async () => {
    if (selectedCount === 0) { showToast('กรุณาเลือกยาที่ต้องการสั่ง', 'error'); return }
    if (!supplier.trim()) { showToast('กรุณาระบุผู้จำหน่าย', 'error'); return }

    const today = new Date().toISOString().slice(0, 10)
    const poItems = items
      .filter(s => picks[s.drug_id]?.selected)
      .map(s => ({
        drug_id:     s.drug_id,
        drug_name:   s.drug_name,
        lot_number:  '',          // to fill in import page
        expiry_date: '',          // to fill in import page
        qty:         picks[s.drug_id]?.qty || 0,
        cost_price:  s.cost_price,
        sell_price:  s.sell_price || null,
      }))
      .filter(i => i.qty > 0)

    if (poItems.length === 0) { showToast('จำนวนทุกรายการต้องมากกว่า 0', 'error'); return }

    setSaving(true)
    try {
      const po = await createImport({
        supplier:     supplier.trim(),
        invoice_no:   invoiceNo.trim(),
        receive_date: today,
        notes:        `สร้างจาก Auto Re-order (${days}d / ${lookahead}d lookahead)`,
        items:        poItems,
      })
      showToast(`สร้างใบนำเข้า ${po.doc_no} แล้ว — ไปกรอกเลขล็อต/วันหมดอายุที่หน้าใบนำเข้า`, 'success')
      onCreated?.()
      onClose()
    } catch (e: unknown) {
      showToast((e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="แนะนำสั่งซื้อ (Auto Re-order)" onClose={onClose}>
      <div className="space-y-3">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-gray-500">วิเคราะห์จากยอดขาย</span>
          <select
            value={days}
            onChange={e => setDays(+e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400"
            disabled={loading || saving}
          >
            {DAYS_PRESETS.map(d => <option key={d} value={d}>{d} วันล่าสุด</option>)}
          </select>
          <span className="text-gray-500">เพื่อให้มีสต็อกคลุม</span>
          <select
            value={lookahead}
            onChange={e => setLookahead(+e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400"
            disabled={loading || saving}
          >
            {LOOKAHEAD_PRESETS.map(d => <option key={d} value={d}>{d} วัน</option>)}
          </select>
        </div>

        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <div className="text-center text-sm text-gray-400 py-8">
            <div>สต็อกเพียงพอสำหรับ {lookahead} วันข้างหน้า 🎉</div>
            <div className="text-xs text-gray-300 mt-1">
              (วิเคราะห์จากยอดขาย {days} วันล่าสุด · ยาที่ไม่มีการขายช่วงนี้จะไม่ถูกแนะนำ)
            </div>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                  {items.length} รายการ
                </span>
                <span className="text-gray-500">เลือก {selectedCount} รายการ</span>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => toggleAll(true)}
                  className="text-xs text-blue-600 hover:underline">เลือกทั้งหมด</button>
                <span className="text-gray-300">|</span>
                <button type="button" onClick={() => toggleAll(false)}
                  className="text-xs text-gray-500 hover:underline">ยกเลิก</button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-auto max-h-80 rounded-lg border border-gray-200">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="w-8 px-2 py-2"></th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">ชื่อยา</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600 whitespace-nowrap">สต็อก</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600 whitespace-nowrap">ขาย/วัน</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600 whitespace-nowrap">เหลือ</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600 whitespace-nowrap">สั่งซื้อ</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(s => {
                    const p = picks[s.drug_id] ?? { selected: false, qty: s.suggested_qty }
                    const urgent = s.current_stock === 0
                    return (
                      <tr key={s.drug_id} className={`border-t border-gray-100 ${urgent ? 'bg-red-50' : ''}`}>
                        <td className="px-2 py-1.5 text-center">
                          <input
                            type="checkbox"
                            checked={p.selected}
                            onChange={e => setSelected(s.drug_id, e.target.checked)}
                            className="accent-blue-600"
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <span className="font-medium text-gray-800">{s.drug_name}</span>
                          {urgent && <span className="ml-1 text-[10px] text-red-600 font-bold">หมด</span>}
                        </td>
                        <td className="px-3 py-1.5 text-right text-gray-700 whitespace-nowrap">
                          {s.current_stock} {s.unit}
                        </td>
                        <td className="px-3 py-1.5 text-right text-gray-500 whitespace-nowrap">
                          {s.avg_daily_sale.toFixed(1)}
                        </td>
                        <td className={`px-3 py-1.5 text-right whitespace-nowrap ${
                          s.days_left < 7 ? 'text-red-600 font-medium' : 'text-gray-500'
                        }`}>
                          {formatDaysLeft(s.days_left)}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={p.qty}
                            onChange={e => setQty(s.drug_id, +e.target.value || 0)}
                            className="w-20 border border-gray-200 rounded px-2 py-0.5 text-right text-xs focus:outline-none focus:border-blue-400"
                            disabled={!p.selected}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* PO meta */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ผู้จำหน่าย *</label>
                <input
                  type="text"
                  value={supplier}
                  onChange={e => setSupplier(e.target.value)}
                  placeholder="เช่น บ.ยาไทย จำกัด"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">เลขที่ใบกำกับ (ไม่บังคับ)</label>
                <input
                  type="text"
                  value={invoiceNo}
                  onChange={e => setInvoiceNo(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100">
              <div className="text-xs text-gray-500">
                มูลค่าประมาณการ: <span className="font-semibold text-gray-800">
                  ฿{estimatedCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={onClose} disabled={saving}>ยกเลิก</Button>
                <Button onClick={handleCreate} disabled={saving || selectedCount === 0}>
                  {saving ? 'กำลังสร้าง...' : `สร้างใบนำเข้า (${selectedCount})`}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
