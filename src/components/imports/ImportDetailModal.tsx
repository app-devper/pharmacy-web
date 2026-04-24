import { useState, useEffect } from 'react'
import { getImport } from '../../api/imports'
import { useToast } from '../../hooks/useToast'
import type { PurchaseOrder } from '../../types/import'
import Spinner from '../ui/Spinner'
import { fmtDate, fmtMoney } from '../../utils/formatters'

interface Props {
  importId: string
  onClose: () => void
}

export default function ImportDetailModal({ importId, onClose }: Props) {
  const showToast = useToast()
  const [po, setPo] = useState<PurchaseOrder | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getImport(importId)
      .then(setPo)
      .catch(e => showToast((e as Error).message, 'error'))
      .finally(() => setLoading(false))
  }, [importId, showToast])

  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-800">
              {po ? `ใบนำเข้า ${po.doc_no}` : 'รายละเอียดใบนำเข้า'}
            </h2>
            {po && (
              <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-xs font-medium ${
                po.status === 'confirmed'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {po.status === 'confirmed' ? 'ยืนยันแล้ว' : 'แบบร่าง'}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-16"><Spinner /></div>
        ) : !po ? (
          <div className="flex-1 flex items-center justify-center py-16 text-gray-400">ไม่พบข้อมูล</div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Meta info */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div className="flex gap-2">
                <span className="text-gray-500 w-28 shrink-0">เลขที่เอกสาร</span>
                <span className="font-mono font-semibold text-gray-800">{po.doc_no}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-500 w-28 shrink-0">ผู้ขาย</span>
                <span className="text-gray-800">{po.supplier || '—'}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-500 w-28 shrink-0">เลขที่ใบส่งของ</span>
                <span className="text-gray-800">{po.invoice_no || '—'}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-500 w-28 shrink-0">วันที่รับสินค้า</span>
                <span className="text-gray-800">{fmtDate(po.receive_date)}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-500 w-28 shrink-0">วันที่สร้าง</span>
                <span className="text-gray-800">{fmtDate(po.created_at)}</span>
              </div>
              {po.confirmed_at && (
                <div className="flex gap-2">
                  <span className="text-gray-500 w-28 shrink-0">ยืนยันเมื่อ</span>
                  <span className="text-gray-800">{fmtDate(po.confirmed_at)}</span>
                </div>
              )}
              {po.notes && (
                <div className="col-span-2 flex gap-2">
                  <span className="text-gray-500 w-28 shrink-0">หมายเหตุ</span>
                  <span className="text-gray-800">{po.notes}</span>
                </div>
              )}
            </div>

            {/* Summary chips */}
            <div className="flex gap-3">
              <div className="bg-blue-50 rounded-xl px-4 py-2 text-center">
                <div className="text-xl font-bold text-blue-700">{po.item_count}</div>
                <div className="text-xs text-blue-500">รายการ</div>
              </div>
              <div className="bg-emerald-50 rounded-xl px-4 py-2 text-center">
                <div className="text-xl font-bold text-emerald-700">
                  {po.items.reduce((s, i) => s + i.qty, 0).toLocaleString()}
                </div>
                <div className="text-xs text-emerald-500">หน่วยรวม</div>
              </div>
              <div className="bg-violet-50 rounded-xl px-4 py-2 text-center">
                <div className="text-xl font-bold text-violet-700">{fmtMoney(po.total_cost)}</div>
                <div className="text-xs text-violet-500">มูลค่ารวม</div>
              </div>
            </div>

            {/* Items table */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">รายการยา</h3>
              <div className="overflow-x-auto border border-gray-100 rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-2 px-3 text-xs text-gray-500 font-semibold w-8">#</th>
                      <th className="text-left py-2 px-3 text-xs text-gray-500 font-semibold min-w-[160px]">ชื่อยา</th>
                      <th className="text-left py-2 px-3 text-xs text-gray-500 font-semibold min-w-[120px]">ล็อตหมายเลข</th>
                      <th className="text-left py-2 px-3 text-xs text-gray-500 font-semibold min-w-[100px]">วันหมดอายุ</th>
                      <th className="text-right py-2 px-3 text-xs text-gray-500 font-semibold w-20">จำนวน</th>
                      <th className="text-right py-2 px-3 text-xs text-gray-500 font-semibold w-28">ราคาทุน/หน่วย</th>
                      <th className="text-right py-2 px-3 text-xs text-gray-500 font-semibold w-28">ราคาขาย</th>
                      <th className="text-right py-2 px-3 text-xs text-gray-500 font-semibold w-28">รวม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {po.items.map((item, idx) => (
                      <tr key={idx} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-400 text-xs">{idx + 1}</td>
                        <td className="px-3 py-2 font-medium text-gray-800">{item.drug_name}</td>
                        <td className="px-3 py-2 font-mono text-xs text-gray-600">{item.lot_number}</td>
                        <td className="px-3 py-2 text-gray-600 text-xs">{item.expiry_date}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{item.qty.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{fmtMoney(item.cost_price)}</td>
                        <td className="px-3 py-2 text-right">
                          {item.sell_price != null
                            ? <span className="text-gray-700">{fmtMoney(item.sell_price)}</span>
                            : <span className="text-gray-300 text-xs">—ค่าเริ่มต้น—</span>
                          }
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-gray-800">
                          {fmtMoney(item.qty * item.cost_price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                    <tr>
                      <td colSpan={7} className="px-3 py-2 text-right text-sm font-semibold text-gray-700">
                        มูลค่ารวมทั้งหมด
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-gray-900">
                        {fmtMoney(po.total_cost)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm text-gray-700 transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  )
}
