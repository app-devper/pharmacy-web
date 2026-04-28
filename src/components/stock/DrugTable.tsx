import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Drug } from '../../types/drug'
import { getDrugSellPrice } from '../../types/drug'
import { StockBadge, TypeBadge, KyBadges } from '../ui/Badge'
import LotListModal from './LotListModal'
import StockAdjustmentModal from './StockAdjustmentModal'
import AdjustmentLogModal from './AdjustmentLogModal'
import { useIsAdmin } from '../../hooks/useIsAdmin'
import { useDrugs } from '../../hooks/useDrugs'

interface Props {
  drugs: Drug[]
  onReload: () => void
}

export default function DrugTable({ drugs, onReload }: Props) {
  const navigate = useNavigate()
  const isAdmin = useIsAdmin()
  const { patchStocks } = useDrugs()
  const [lotDrug, setLotDrug]       = useState<Drug | null>(null)
  const [adjustDrug, setAdjustDrug] = useState<Drug | null>(null)
  const [logDrug, setLogDrug]       = useState<Drug | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)

  // Virtualize table rows — only render rows visible in the scroll viewport
  // (+ overscan). Handles thousands of drugs smoothly. Row heights are
  // measured dynamically because rows with reg_no or negative-stock badges
  // are taller than plain rows.
  const virtualizer = useVirtualizer({
    count: drugs.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 56,
    overscan: 10,
  })

  const virtualItems = virtualizer.getVirtualItems()
  const totalSize = virtualizer.getTotalSize()
  const paddingTop    = virtualItems.length > 0 ? virtualItems[0].start : 0
  const paddingBottom = virtualItems.length > 0 ? totalSize - virtualItems[virtualItems.length - 1].end : 0

  const handleAdjusted = (updated: Drug) => {
    // Sync shared cache so SellPage (and anywhere else using useDrugs) reflects
    // the new stock immediately — no need for localOverrides anymore.
    patchStocks([{ drug_id: updated.id, new_stock: updated.stock }])
    setAdjustDrug(null)
    if (logDrug?.id === updated.id) setLogDrug(updated)
  }

  return (
    <>
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0 z-10">
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
              <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {paddingTop > 0 && (
              <tr aria-hidden="true"><td colSpan={11} style={{ height: paddingTop, padding: 0, border: 0 }} /></tr>
            )}
            {virtualItems.map(v => {
              const drug = drugs[v.index]
              return (
                <tr
                  key={drug.id}
                  ref={virtualizer.measureElement}
                  data-index={v.index}
                  onClick={() => setLogDrug(drug)}
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                >
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
                  <td
                    className={`py-3 px-3 text-right font-medium whitespace-nowrap ${
                      drug.stock < 0 ? 'text-red-600' : ''
                    }`}
                    title={drug.stock < 0 ? `ค้างส่ง ${-drug.stock} ${drug.unit} · จะ reconcile อัตโนมัติเมื่อ import ล็อตถัดไป` : undefined}
                  >
                    {drug.stock} {drug.unit}
                    {drug.stock < 0 && (
                      <span className="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700 align-middle">
                        ติดลบ · รอเข้าของ
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap"><StockBadge stock={drug.stock} minStock={drug.min_stock} /></td>
                  <td className="py-3 px-3 text-gray-400 text-xs">{drug.barcode || '—'}</td>
                  <td className="py-3 px-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1 flex-nowrap">
                      {isAdmin && (
                        <button
                          onClick={() => navigate(`/stock/${drug.id}/edit`)}
                          className="text-xs px-2 py-1 rounded text-blue-700 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 whitespace-nowrap"
                        >แก้ไข</button>
                      )}
                      <button
                        onClick={() => setLotDrug(drug)}
                        className="text-xs px-2 py-1 rounded text-indigo-600 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 whitespace-nowrap"
                      >ล็อต</button>
                      {isAdmin && (
                        <button
                          onClick={() => setAdjustDrug(drug)}
                          className="text-xs px-2 py-1 rounded text-emerald-700 hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 whitespace-nowrap"
                        >ปรับสต็อก</button>
                      )}
                      <button
                        onClick={() => setLogDrug(drug)}
                        className="text-xs px-2 py-1 rounded text-gray-500 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 whitespace-nowrap"
                      >ประวัติ</button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {paddingBottom > 0 && (
              <tr aria-hidden="true"><td colSpan={11} style={{ height: paddingBottom, padding: 0, border: 0 }} /></tr>
            )}
            {drugs.length === 0 && (
              <tr>
                <td colSpan={11} className="py-8 text-center text-gray-400 text-sm">ไม่พบรายการ</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
