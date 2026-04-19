import { useState } from 'react'
import { voidSale } from '../../api/sales'
import { useToast } from '../../hooks/useToast'
import type { Sale } from '../../types/sale'

interface Props {
  sale: Sale
  onVoided: () => void
  onClose: () => void
}

export default function VoidSaleModal({ sale, onVoided, onClose }: Props) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const showToast = useToast()

  const handleConfirm = async () => {
    if (!reason.trim()) { showToast('กรุณาระบุเหตุผล', 'error'); return }
    setSaving(true)
    try {
      await voidSale(sale.id, reason.trim())
      showToast(`ยกเลิกบิล ${sale.bill_no} สำเร็จ`, 'success')
      onVoided()
    } catch (e: unknown) {
      showToast((e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">ยกเลิกบิล</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Bill info */}
          <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">เลขบิล</span>
              <span className="font-mono font-semibold text-gray-800">{sale.bill_no}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">ยอด</span>
              <span className="font-semibold text-blue-600">฿{sale.total.toLocaleString()}</span>
            </div>
          </div>

          {/* Warning */}
          <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-sm text-amber-800">
            <span className="shrink-0">⚠</span>
            <span>การยกเลิกบิลจะคืนสต็อกยาอัตโนมัติและไม่สามารถย้อนกลับได้</span>
          </div>

          {/* Reason input */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              เหตุผล <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="ระบุเหตุผลในการยกเลิกบิล…"
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400 resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleConfirm}
              disabled={saving || !reason.trim()}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg py-2 text-sm font-medium transition-colors"
            >
              {saving ? 'กำลังดำเนินการ…' : 'ยืนยันยกเลิกบิล'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
