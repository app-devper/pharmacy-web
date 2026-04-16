import { useState } from 'react'
import type { Drug } from '../../types/drug'
import { getDrugSellPrice } from '../../types/drug'
import { StockBadge, TypeBadge, KyBadges } from '../ui/Badge'
import EditDrugModal from './EditDrugModal'
import LotListModal from './LotListModal'
import StockAdjustmentModal from './StockAdjustmentModal'
import AdjustmentLogModal from './AdjustmentLogModal'

interface Props {
  drugs: Drug[]
  onReload: () => void
}

export default function DrugTable({ drugs, onReload }: Props) {
  const [editing, setEditing]       = useState<Drug | null>(null)
  const [lotDrug, setLotDrug]       = useState<Drug | null>(null)
  const [adjustDrug, setAdjustDrug] = useState<Drug | null>(null)
  const [logDrug, setLogDrug]       = useState<Drug | null>(null)

  // Local overrides: update stock display immediately after adjustment (no full reload)
  const [localOverrides, setLocalOverrides] = useState<Record<string, Drug>>({})

  const displayDrug = (d: Drug) => localOverrides[d.id] ?? d

  const handleAdjusted = (updated: Drug) => {
    setLocalOverrides(prev => ({ ...prev, [updated.id]: updated }))
    setAdjustDrug(null)
    if (logDrug?.id === updated.id) setLogDrug(updated)
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">ชื่อยา</th>
              <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">ชื่อสามัญ</th>
              <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">ขนาด</th>
              <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">ประเภท</th>
              <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">รายงาน ขย.</th>
              <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500 uppercase">ราคาทุน</th>
              <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500 uppercase">ราคาขาย</th>
              <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500 uppercase">สต็อก</th>
              <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">สถานะ</th>
              <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">บาร์โค้ด</th>
              <th className="py-3 px-3"></th>
            </tr>
          </thead>
          <tbody>
            {drugs.map(raw => {
              const drug = displayDrug(raw)
              return (
                <tr key={drug.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-3 font-medium text-gray-800">
                    {drug.name}
                    {drug.reg_no && <div className="text-xs text-gray-400 font-normal">{drug.reg_no}</div>}
                  </td>
                  <td className="py-3 px-3 text-gray-500 text-xs">{drug.generic_name || '—'}</td>
                  <td className="py-3 px-3 text-gray-500 text-xs">{drug.strength || '—'}</td>
                  <td className="py-3 px-3"><TypeBadge type={drug.type} /></td>
                  <td className="py-3 px-3"><KyBadges types={drug.report_types ?? []} /></td>
                  <td className="py-3 px-3 text-right text-gray-500 text-xs">
                    {drug.cost_price ? `฿${drug.cost_price.toLocaleString()}` : '—'}
                  </td>
                  <td className="py-3 px-3 text-right font-medium text-gray-800">
                    ฿{getDrugSellPrice(drug).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-medium">{drug.stock} {drug.unit}</td>
                  <td className="py-3 px-3"><StockBadge stock={drug.stock} /></td>
                  <td className="py-3 px-3 text-gray-400 text-xs">{drug.barcode || '—'}</td>
                  <td className="py-3 px-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditing(drug)}
                        className="text-xs text-gray-500 hover:text-gray-700 hover:underline"
                      >แก้ไข</button>
                      <button
                        onClick={() => setLotDrug(drug)}
                        className="text-xs text-blue-600 hover:underline"
                      >ล็อต</button>
                      <button
                        onClick={() => setAdjustDrug(drug)}
                        className="text-xs text-emerald-600 hover:underline"
                      >ปรับสต็อก</button>
                      <button
                        onClick={() => setLogDrug(drug)}
                        className="text-xs text-gray-400 hover:text-gray-600 hover:underline"
                      >ประวัติ</button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {drugs.length === 0 && (
              <tr>
                <td colSpan={11} className="py-8 text-center text-gray-400 text-sm">ไม่พบรายการ</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditDrugModal
          drug={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); onReload() }}
        />
      )}
      {lotDrug && (
        <LotListModal
          drug={lotDrug}
          onClose={() => setLotDrug(null)}
          onReload={onReload}
        />
      )}
      {adjustDrug && (
        <StockAdjustmentModal
          drug={adjustDrug}
          onClose={() => setAdjustDrug(null)}
          onSaved={handleAdjusted}
        />
      )}
      {logDrug && (
        <AdjustmentLogModal
          drug={logDrug}
          onClose={() => setLogDrug(null)}
        />
      )}
    </>
  )
}
