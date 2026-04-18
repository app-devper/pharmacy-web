import { useState, useEffect } from 'react'
import { getSaleItems, getReturns } from '../../api/sales'
import { useToast } from '../../hooks/useToast'
import { printReceipt } from '../../utils/printReceipt'
import { fmtDateTime, fmtMoney } from '../../utils/formatters'
import type { Sale, SaleItem, DrugReturn } from '../../types/sale'
import Spinner from '../ui/Spinner'
import VoidSaleModal from './VoidSaleModal'
import ReturnSaleModal from './ReturnSaleModal'
import { useIsAdmin } from '../../hooks/useIsAdmin'
import { useSettings } from '../../context/SettingsContext'
import { getTierLabel } from '../../utils/pricing'

interface Props {
  sale: Sale
  onClose: () => void
  onSaleChanged?: () => void
}

export default function SaleDetailModal({ sale, onClose, onSaleChanged }: Props) {
  const showToast = useToast()
  const isAdmin = useIsAdmin()
  const { settings } = useSettings()
  const [items, setItems]     = useState<SaleItem[]>([])
  const [returns, setReturns] = useState<DrugReturn[]>([])
  const [loading, setLoading] = useState(true)
  const [showVoid, setShowVoid]     = useState(false)
  const [showReturn, setShowReturn] = useState(false)

  useEffect(() => {
    let mounted = true
    Promise.all([getSaleItems(sale.id), getReturns(sale.id)])
      .then(([its, rets]) => {
        if (mounted) { setItems(its); setReturns(rets) }
      })
      .catch(e => { if (mounted) showToast((e as Error).message, 'error') })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [sale.id, showToast])

  const handlePrint = () => {
    if (items.length === 0) {
      showToast('กำลังโหลดรายการ รอสักครู่', 'error')
      return
    }
    printReceipt({
      billNo:   sale.bill_no,
      date:     fmtDateTime(sale.sold_at),
      items:    items.map(i => {
        const factor = i.unit_factor && i.unit_factor > 1 ? i.unit_factor : 1
        return {
          name:  i.drug_name,
          qty:   Math.floor(i.qty / factor),
          price: i.price * factor,
          unit:  i.unit || undefined,
        }
      }),
      discount: sale.discount,
      total:    sale.total,
      received: sale.received,
      change:   sale.change,
      // Pull current shop info from settings so the re-print has the same
      // header/footer/pharmacist as a fresh receipt — not the built-in defaults.
      paperWidth:     settings.receipt.paper_width === '80' ? '80mm' : '58mm',
      shopName:       settings.store.name,
      shopAddress:    settings.store.address,
      shopPhone:      settings.store.phone,
      shopTaxId:      settings.store.tax_id,
      headerText:     settings.receipt.header,
      footerText:     settings.receipt.footer,
      pharmacistName: settings.receipt.show_pharmacist && settings.pharmacist.name
        ? settings.pharmacist.name + (settings.pharmacist.license_no ? ` (${settings.pharmacist.license_no})` : '')
        : '',
    })
  }

  const handleReturned = (newReturn: DrugReturn) => {
    setReturns(prev => [newReturn, ...prev])
    setShowReturn(false)
    onSaleChanged?.()
  }

  // Detect a single consistent price tier for this sale to show as a header badge.
  const tierSet = new Set(items.map(i => i.price_tier || 'retail').filter(Boolean))
  const soleTier = tierSet.size === 1 ? Array.from(tierSet)[0] : null

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overscroll-contain" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-3">
              <div>
                <div className="font-mono font-bold text-gray-800">{sale.bill_no}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-400">{fmtDateTime(sale.sold_at)}</span>
                  {returns.length > 0 && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                      📦 คืนแล้ว {returns.length} ครั้ง
                    </span>
                  )}
                </div>
              </div>
              {sale.voided && (
                <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-semibold rounded-full">
                  ยกเลิกแล้ว
                </span>
              )}
              {soleTier && soleTier !== 'retail' && (
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">
                  {getTierLabel(soleTier)}
                </span>
              )}
            </div>
            <button onClick={onClose} aria-label="ปิด" className="text-gray-400 hover:text-gray-600 text-2xl leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded">×</button>
          </div>

          {/* Void reason banner */}
          {sale.voided && sale.void_reason && (
            <div className="px-5 py-2.5 bg-red-50 border-b border-red-100 text-sm text-red-700 flex items-start gap-2">
              <span className="shrink-0 mt-0.5">⊘</span>
              <span><span className="font-medium">เหตุผล:</span> {sale.void_reason}</span>
            </div>
          )}

          {/* Customer */}
          {sale.customer_name && (
            <div className="px-5 py-2.5 bg-blue-50 border-b border-blue-100 text-sm text-blue-700 flex items-center gap-2">
              <span>👤</span>
              <span>{sale.customer_name}</span>
            </div>
          )}

          {/* Items */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-10"><Spinner /></div>
            ) : items.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-10">ไม่พบรายการ</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-2 px-5 text-xs text-gray-500 font-semibold">ยา</th>
                    <th className="text-right py-2 px-3 text-xs text-gray-500 font-semibold">จำนวน</th>
                    <th className="text-right py-2 px-3 text-xs text-gray-500 font-semibold">ราคา/หน่วย</th>
                    <th className="text-right py-2 px-5 text-xs text-gray-500 font-semibold">รวม</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => {
                    const factor = item.unit_factor && item.unit_factor > 1 ? item.unit_factor : 1
                    const displayQty = factor > 1 ? Math.floor(item.qty / factor) : item.qty
                    const displayPrice = item.price * factor
                    return (
                      <tr key={item.id} className="border-t border-gray-50">
                        <td className="py-2.5 px-5 text-gray-800 font-medium">
                          {item.drug_name}
                          {item.unit && <span className="ml-1 text-xs text-indigo-500">· {item.unit}</span>}
                        </td>
                        <td className="py-2.5 px-3 text-right text-gray-600">{displayQty}</td>
                        <td className="py-2.5 px-3 text-right text-gray-600" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(displayPrice)}</td>
                        <td className="py-2.5 px-5 text-right font-semibold text-gray-800" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {fmtMoney(item.subtotal)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-gray-100 space-y-1 shrink-0">
            {sale.discount > 0 && (
              <div className="flex justify-between text-sm text-rose-500">
                <span>ส่วนลด</span>
                <span>-{fmtMoney(sale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{sale.discount > 0 ? 'ยอดสุทธิ' : 'ยอดรวม'}</span>
              <span className="font-bold text-gray-800">{fmtMoney(sale.total)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>รับเงิน</span><span>{fmtMoney(sale.received)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>ทอน</span><span>{fmtMoney(sale.change)}</span>
            </div>

            <div className="flex gap-2 pt-2">
              {!sale.voided && (
                <>
                  {isAdmin && (
                    <button
                      onClick={() => setShowVoid(true)}
                      className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                    >
                      ยกเลิกบิล
                    </button>
                  )}
                  <button
                    onClick={() => setShowReturn(true)}
                    disabled={loading}
                    className="px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 text-sm transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  >
                    คืนยา
                  </button>
                </>
              )}
              <div className="flex-1" />
              <button
                onClick={handlePrint}
                disabled={loading}
                aria-label="พิมพ์ใบเสร็จ"
                className="px-4 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm text-gray-600 transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                🖨 พิมพ์
              </button>
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      </div>

      {showVoid && (
        <VoidSaleModal
          sale={sale}
          onVoided={() => { setShowVoid(false); onClose(); onSaleChanged?.() }}
          onClose={() => setShowVoid(false)}
        />
      )}

      {showReturn && (
        <ReturnSaleModal
          sale={sale}
          items={items}
          existingReturns={returns}
          onClose={() => setShowReturn(false)}
          onReturned={handleReturned}
        />
      )}
    </>
  )
}
