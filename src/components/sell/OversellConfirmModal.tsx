import { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

export interface OversellRow {
  drug_id: string
  drug_name: string
  /** How many base units the cashier wants to sell. */
  need: number
  /** Current stock in base units (may be 0 or negative already). */
  available: number
  /** Alt unit display label ("" = base) and factor, for friendlier copy. */
  unit?: string
  unit_factor?: number
}

interface Props {
  rows: OversellRow[]
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Confirmation shown right before checkout when at least one line needs more
 * stock than the drug has on hand. Splitting this out of Cart keeps the main
 * checkout logic linear — if the user confirms, the caller re-runs createSale
 * with `allow_oversell: true` attached to the over-stocked lines.
 *
 * Design note: we require an explicit acknowledge checkbox (not just a
 * primary button) because in Thai pharmacy practice overselling has real
 * accountability implications — the cashier is committing to reconcile the
 * shortfall against a future import.
 */
export default function OversellConfirmModal({ rows, onConfirm, onCancel }: Props) {
  const [ack, setAck] = useState(false)

  const fmt = (r: OversellRow, qty: number) => {
    const factor = r.unit_factor ?? 1
    if (r.unit && factor > 1) {
      const asAlt = qty / factor
      // Mixed display: show both alt + base so cashier can sanity-check.
      return Number.isInteger(asAlt)
        ? `${asAlt} ${r.unit} (${qty} หน่วยหลัก)`
        : `${qty} หน่วยหลัก`
    }
    return `${qty} หน่วย`
  }

  return (
    <Modal title="ยืนยันขายล่วงหน้า" onClose={onCancel}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600 leading-relaxed">
          รายการต่อไปนี้<span className="font-semibold">เกินสต็อกที่มี</span>
          — หากยืนยัน ระบบจะบันทึกส่วนที่เกินเป็น "หนี้สต็อก"
          และ reconcile อัตโนมัติเมื่อมีการ import ล็อตใหม่
        </p>

        <div className="rounded-lg border border-amber-200 bg-amber-50 divide-y divide-amber-100">
          {rows.map(r => {
            const shortfall = Math.max(0, r.need - Math.max(0, r.available))
            return (
              <div key={r.drug_id} className="px-3 py-2 text-sm">
                <div className="font-medium text-gray-800">{r.drug_name}</div>
                <div className="text-xs text-gray-600 mt-0.5 space-y-0.5">
                  <div>ต้องการ: {fmt(r, r.need)}</div>
                  <div>
                    มีในสต็อก: <span className="font-semibold">{r.available}</span>
                    {' '}· ขายล่วงหน้า{' '}
                    <span className="font-semibold text-amber-700">{fmt(r, shortfall)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <label className="flex items-start gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={ack}
            onChange={e => setAck(e.target.checked)}
            className="accent-amber-600 mt-0.5"
          />
          <span className="text-sm text-gray-700">
            ทราบและยืนยันขายล่วงหน้า
            <span className="block text-[11px] text-gray-500">
              ส่วนที่เกินจะถูก reconcile กับ import ล็อตถัดไปอัตโนมัติ ·
              รายการที่ค้างจะแสดง badge ในประวัติการขาย
            </span>
          </span>
        </label>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="secondary" onClick={onCancel}>ยกเลิก</Button>
          <Button
            onClick={onConfirm}
            disabled={!ack}
            className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
          >
            ยืนยันขายเกิน
          </Button>
        </div>
      </div>
    </Modal>
  )
}
