import { useState, useEffect, useCallback } from 'react'
import { getLots, deleteLot } from '../../api/drugs'
import { useToast } from '../../hooks/useToast'
import { Drug, DrugLot } from '../../types/drug'
import AddLotModal from './AddLotModal'
import Spinner from '../ui/Spinner'

interface Props {
  drug: Drug
  onClose: () => void
  onReload: () => void
}

function getLotStatus(expiryDate: string): { label: string; cls: string } {
  const exp = new Date(expiryDate)
  const today = new Date()
  const daysLeft = (exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  if (daysLeft < 0) return { label: 'หมดอายุ', cls: 'bg-red-100 text-red-700' }
  if (daysLeft <= 90) return { label: 'ใกล้หมดอายุ', cls: 'bg-amber-100 text-amber-700' }
  return { label: 'ปกติ', cls: 'bg-green-100 text-green-700' }
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function LotListModal({ drug, onClose, onReload }: Props) {
  const showToast = useToast()
  const [lots, setLots] = useState<DrugLot[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddLot, setShowAddLot] = useState(false)

  const loadLots = useCallback(async () => {
    setLoading(true)
    try { setLots(await getLots(drug.id)) }
    catch (e: unknown) { showToast((e as Error).message, 'error') }
    finally { setLoading(false) }
  }, [drug.id, showToast])

  useEffect(() => { loadLots() }, [loadLots])

  const handleDelete = async (lot: DrugLot) => {
    if (!window.confirm(`ลบล็อต "${lot.lot_number}" (คงเหลือ ${lot.remaining} ${drug.unit})?`)) return
    try {
      await deleteLot(drug.id, lot.id)
      showToast('ลบล็อตสำเร็จ')
      onReload()
      loadLots()
    } catch (e: unknown) {
      showToast((e as Error).message, 'error')
    }
  }

  // First lot with remaining > 0 is the "next to deduct" (FEFO)
  const nextLotId = lots.find(l => l.remaining > 0)?.id

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-base font-semibold text-gray-800">ล็อตสินค้า — {drug.name}</h2>
              {drug.generic_name && (
                <p className="text-xs text-gray-400">{drug.generic_name}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">
                สต็อกรวม: <strong className="text-gray-800">{drug.stock} {drug.unit}</strong>
              </span>
              <button
                onClick={() => setShowAddLot(true)}
                className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                + เพิ่มล็อต
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >×</button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-auto p-4">
            {loading ? (
              <div className="py-8"><Spinner /></div>
            ) : lots.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-12">ยังไม่มีล็อตสินค้า</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">ล็อตหมายเลข</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">วันนำเข้า</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">วันหมดอายุ</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">สถานะ</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">นำเข้า</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">คงเหลือ</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">ราคาทุน</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">ราคาขาย</th>
                    <th className="py-2 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {lots.map(lot => {
                    const status = getLotStatus(lot.expiry_date)
                    const isNext = lot.id === nextLotId
                    return (
                      <tr key={lot.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2.5 px-3 font-medium text-gray-800">
                          <div className="flex items-center gap-1.5">
                            {lot.lot_number}
                            {isNext && (
                              <span className="px-1.5 py-0.5 text-[10px] rounded bg-blue-100 text-blue-700 font-semibold">ถัดไป</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-gray-500">{fmtDate(lot.import_date)}</td>
                        <td className="py-2.5 px-3 text-gray-500">{fmtDate(lot.expiry_date)}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${status.cls}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-gray-600">{lot.quantity}</td>
                        <td className="py-2.5 px-3 text-right font-medium text-gray-800">{lot.remaining}</td>
                        <td className="py-2.5 px-3 text-right">
                          {lot.cost_price != null
                            ? <span>฿{lot.cost_price.toLocaleString()}</span>
                            : <span className="text-gray-400 text-xs">—ค่าเริ่มต้น—</span>
                          }
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {lot.sell_price != null
                            ? <span>฿{lot.sell_price.toLocaleString()}</span>
                            : <span className="text-gray-400 text-xs">—ค่าเริ่มต้น—</span>
                          }
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleDelete(lot)}
                            className="text-xs text-red-500 hover:text-red-700 hover:underline"
                          >ลบ</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {showAddLot && (
        <AddLotModal
          drug={drug}
          onClose={() => setShowAddLot(false)}
          onSaved={() => { setShowAddLot(false); loadLots(); onReload() }}
        />
      )}
    </>
  )
}
