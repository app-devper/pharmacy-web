import { useState, useMemo } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { createReturn } from '../../api/sales'
import { useToast } from '../../hooks/useToast'
import { fmtDate, fmtMoney } from '../../utils/formatters'
import type { Sale, SaleItem, DrugReturn } from '../../types/sale'

interface Props {
  sale: Sale
  items: SaleItem[]
  existingReturns: DrugReturn[]
  onClose: () => void
  onReturned: (r: DrugReturn) => void
}

export default function ReturnSaleModal({ sale, items, existingReturns, onClose, onReturned }: Props) {
  const showToast = useToast()
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>(() =>
    Object.fromEntries(items.map(i => [i.id, 0]))
  )
  const [reason, setReason]   = useState('')
  const [loading, setLoading] = useState(false)

  // Compute already-returned qty per sale_item from existing returns
  const alreadyReturned = useMemo(() => {
    const map: Record<string, number> = {}
    for (const ret of existingReturns) {
      for (const ri of ret.items) {
        map[ri.sale_item_id] = (map[ri.sale_item_id] ?? 0) + ri.qty
      }
    }
    return map
  }, [existingReturns])

  const maxQty = useMemo(() =>
    Object.fromEntries(items.map(i => [i.id, i.qty - (alreadyReturned[i.id] ?? 0)])),
    [items, alreadyReturned]
  )

  const setQty = (id: string, val: number) => {
    const max = maxQty[id]
    setReturnQtys(prev => ({ ...prev, [id]: Math.max(0, Math.min(val, max)) }))
  }

  const refund = useMemo(() =>
    items.reduce((sum, i) => sum + (returnQtys[i.id] ?? 0) * i.price, 0),
    [items, returnQtys]
  )

  const canSave = refund > 0 && reason.trim() !== '' && !loading

  const handleSave = async () => {
    if (!canSave) return
    setLoading(true)
    try {
      const filteredItems = items
        .filter(i => (returnQtys[i.id] ?? 0) > 0)
        .map(i => ({ sale_item_id: i.id, qty: returnQtys[i.id] }))

      const result = await createReturn(sale.id, { items: filteredItems, reason: reason.trim() })
      showToast(`คืนยาสำเร็จ — คืนเงิน ${fmtMoney(result.refund)}`)
      onReturned(result)
    } catch (e: unknown) {
      showToast((e as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="คืนยา" onClose={onClose}>
      <div className="space-y-4">
        {/* Bill info */}
        <div className="bg-gray-50 rounded-lg px-4 py-2.5 flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">{sale.bill_no}</span>
          <span className="text-gray-400">{fmtDate(sale.sold_at)}</span>
        </div>

        {/* Previous returns info */}
        {existingReturns.length > 0 && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700">
            <span>ℹ️</span>
            <span>มีการคืนก่อนหน้า <strong>{existingReturns.length}</strong> ครั้ง</span>
          </div>
        )}

        {/* Items table */}
        <div className="border border-gray-100 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">ชื่อยา</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">ราคา/หน่วย</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">ขายไป</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">คืนแล้ว</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500">คืนครั้งนี้</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const max = maxQty[item.id]
                const done = max === 0
                return (
                  <tr key={item.id} className={`border-t border-gray-50 ${done ? 'opacity-40' : ''}`}>
                    <td className="py-2.5 px-3 text-gray-800 font-medium">
                      {item.drug_name}
                      {done && (
                        <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                          คืนครบแล้ว
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right text-gray-500 text-xs">
                      {fmtMoney(item.price)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-gray-600">{item.qty}</td>
                    <td className="py-2.5 px-3 text-right text-gray-400">
                      {alreadyReturned[item.id] ?? 0}
                    </td>
                    <td className="py-2.5 px-3">
                      {done ? (
                        <div className="text-center text-gray-300 text-xs">—</div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setQty(item.id, (returnQtys[item.id] ?? 0) - 1)}
                            className="w-7 h-7 rounded border border-gray-200 text-gray-600 hover:bg-red-50 hover:border-red-300 hover:text-red-600 text-sm font-bold transition-colors"
                          >−</button>
                          <input
                            type="number"
                            min={0}
                            max={max}
                            value={returnQtys[item.id] ?? 0}
                            onChange={e => setQty(item.id, parseInt(e.target.value) || 0)}
                            className="w-12 border border-gray-200 rounded px-1 py-1 text-sm text-center focus:outline-none focus:border-blue-400"
                          />
                          <button
                            type="button"
                            onClick={() => setQty(item.id, (returnQtys[item.id] ?? 0) + 1)}
                            className="w-7 h-7 rounded border border-gray-200 text-gray-600 hover:bg-green-50 hover:border-green-300 hover:text-green-600 text-sm font-bold transition-colors"
                          >+</button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Refund preview */}
        <div className={`flex items-center justify-between rounded-lg px-4 py-3 text-sm ${
          refund > 0 ? 'bg-green-50' : 'bg-gray-50'
        }`}>
          <span className="text-gray-500">คืนเงิน</span>
          <span className={`text-lg font-bold ${refund > 0 ? 'text-green-700' : 'text-gray-400'}`}>
            {fmtMoney(refund)}
          </span>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">เหตุผล *</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={2}
            placeholder="เหตุผลการคืนยา..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" className="flex-1" onClick={onClose}>ยกเลิก</Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={!canSave}
          >
            {loading ? 'กำลังบันทึก...' : 'ยืนยันคืนยา'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
