import { useEffect, useState } from 'react'
import { getLots } from '../../api/drugs'
import type { DrugLot } from '../../types/drug'
import type { LotTarget } from '../../types/stockAdjustment'

/**
 * Where an increase of a lot-tracked drug goes (pharmacy-api ADR-0007): an
 * existing lot, or a new lot with its number and expiry. Reports null while
 * the choice is incomplete; renders nothing for a drug that has no lots,
 * which keeps stock alone.
 */
export default function LotPicker({ drugId, onChange }: {
  drugId: string
  onChange: (target: LotTarget | null, needed: boolean) => void
}) {
  const [lots, setLots] = useState<DrugLot[] | null>(null)
  const [choice, setChoice] = useState<string>('')
  const [lotNumber, setLotNumber] = useState('')
  const [expiry, setExpiry] = useState('')

  useEffect(() => {
    let alive = true
    getLots(drugId)
      .then(all => {
        if (!alive) return
        const usable = all
          .filter(l => !l.written_off_at)
          .sort((a, b) => b.expiry_date.localeCompare(a.expiry_date))
        setLots(usable)
        setChoice(usable[0]?.id ?? 'new')
      })
      .catch(() => alive && setLots([]))
    return () => { alive = false }
  }, [drugId])

  const needed = lots !== null && lots.length > 0
  useEffect(() => {
    if (lots === null) return onChange(null, true)
    if (!needed) return onChange(null, false)
    if (choice === 'new') {
      onChange(lotNumber.trim() && expiry ? { lot_number: lotNumber.trim(), expiry_date: expiry } : null, true)
    } else {
      onChange({ lot_id: choice }, true)
    }
    // onChange is a parent callback; re-run only when the choice changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lots, choice, lotNumber, expiry])

  if (lots === null) return <div className="text-xs text-gray-400">กำลังโหลดล็อต…</div>
  if (!needed) return null

  const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white'
  return (
    <div className="space-y-2">
      <select value={choice} onChange={e => setChoice(e.target.value)} className={inp}>
        {lots.map(l => (
          <option key={l.id} value={l.id}>
            {l.lot_number} · หมดอายุ {l.expiry_date.slice(0, 10)} · คงเหลือ {l.remaining}
          </option>
        ))}
        <option value="new">+ ล็อตใหม่</option>
      </select>
      {choice === 'new' && (
        <div className="grid grid-cols-2 gap-2">
          <input value={lotNumber} onChange={e => setLotNumber(e.target.value)} placeholder="เลขล็อต" className={inp} />
          <input type="date" value={expiry} onChange={e => setExpiry(e.target.value)} className={inp} />
        </div>
      )}
    </div>
  )
}
