import { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { createAdjustment } from '../../api/stockAdjustments'
import { useToast } from '../../hooks/useToast'
import type { Drug } from '../../types/drug'
import { ADJUSTMENT_REASONS, type AdjustmentReason } from '../../types/stockAdjustment'

interface Props {
  drug: Drug
  onClose: () => void
  onSaved: (updated: Drug) => void
}

export default function StockAdjustmentModal({ drug, onClose, onSaved }: Props) {
  const showToast = useToast()
  const [delta, setDelta]   = useState(0)
  const [reason, setReason] = useState<AdjustmentReason | ''>('')
  const [note, setNote]     = useState('')
  const [loading, setLoading] = useState(false)

  const preview = drug.stock + delta
  const canSave = delta !== 0 && reason !== ''

  const handleSave = async () => {
    if (!canSave) return
    setLoading(true)
    try {
      const updated = await createAdjustment(drug.id, { delta, reason: reason as AdjustmentReason, note })
      showToast(`ปรับสต็อกสำเร็จ: ${drug.stock} → ${updated.stock} ${drug.unit}`)
      onSaved(updated)
    } catch (e: unknown) {
      showToast((e as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="ปรับสต็อกยา" onClose={onClose}>
      <div className="space-y-4">
        {/* Drug name */}
        <div className="bg-gray-50 rounded-lg px-4 py-3">
          <div className="text-sm font-semibold text-gray-800">{drug.name}</div>
          {drug.generic_name && (
            <div className="text-xs text-gray-500 mt-0.5">{drug.generic_name}</div>
          )}
        </div>

        {/* Delta input */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">จำนวนที่ปรับ</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDelta(d => d - 1)}
              className="w-9 h-9 rounded-lg border border-gray-200 text-gray-600 hover:bg-red-50 hover:border-red-300 hover:text-red-600 text-lg font-bold transition-colors"
            >−</button>
            <input
              type="number"
              value={delta}
              onChange={e => setDelta(parseInt(e.target.value) || 0)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:border-blue-400"
            />
            <button
              type="button"
              onClick={() => setDelta(d => d + 1)}
              className="w-9 h-9 rounded-lg border border-gray-200 text-gray-600 hover:bg-green-50 hover:border-green-300 hover:text-green-600 text-lg font-bold transition-colors"
            >+</button>
          </div>
        </div>

        {/* Stock preview */}
        <div className={`flex items-center justify-between rounded-lg px-4 py-3 text-sm ${
          delta === 0 ? 'bg-gray-50' : delta > 0 ? 'bg-green-50' : 'bg-red-50'
        }`}>
          <span className="text-gray-500">สต็อกหลังปรับ</span>
          <span className="font-semibold text-gray-800">
            <span className="text-gray-400">{drug.stock}</span>
            {' → '}
            <span className={delta > 0 ? 'text-green-700' : delta < 0 ? 'text-red-600' : 'text-gray-600'}>
              {preview}
            </span>
            {' '}<span className="text-gray-400 font-normal">{drug.unit}</span>
          </span>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">เหตุผล *</label>
          <select
            value={reason}
            onChange={e => setReason(e.target.value as AdjustmentReason | '')}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white"
          >
            <option value="">— เลือกเหตุผล —</option>
            {ADJUSTMENT_REASONS.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Note */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">หมายเหตุ (ไม่บังคับ)</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            placeholder="รายละเอียดเพิ่มเติม…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" className="flex-1" onClick={onClose}>ยกเลิก</Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={!canSave || loading}
          >
            {loading ? 'กำลังบันทึก…' : 'ยืนยันปรับสต็อก'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
