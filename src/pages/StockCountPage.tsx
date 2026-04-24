import { useEffect, useMemo, useState } from 'react'
import { useDrugs } from '../hooks/useDrugs'
import { useToast } from '../hooks/useToast'
import { createStockCount, getStockCounts } from '../api/stockCounts'
import type { StockCount } from '../types/stockCount'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import { fmtDateTime } from '../utils/formatters'

type CountInputs = Record<string, string>

export default function StockCountPage() {
  const { drugs, loading, reload } = useDrugs()
  const showToast = useToast()
  const [counts, setCounts] = useState<StockCount[]>([])
  const [countInputs, setCountInputs] = useState<CountInputs>({})
  const [search, setSearch] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getStockCounts()
      .then(setCounts)
      .catch(e => showToast((e as Error).message, 'error'))
  }, [showToast])

  const filteredDrugs = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return drugs
    return drugs.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.generic_name.toLowerCase().includes(q) ||
      d.barcode.includes(q)
    )
  }, [drugs, search])

  const draftItems = useMemo(() => {
    return drugs.flatMap(drug => {
      const raw = countInputs[drug.id]
      if (raw == null || raw === '') return []
      const counted = Number(raw)
      if (!Number.isInteger(counted) || counted < 0) return []
      return [{
        drug,
        counted,
        delta: counted - drug.stock,
      }]
    })
  }, [countInputs, drugs])

  const changedItems = draftItems.filter(item => item.delta !== 0)
  const totalAbsDelta = changedItems.reduce((sum, item) => sum + Math.abs(item.delta), 0)

  const setCount = (drugId: string, value: string) => {
    setCountInputs(prev => ({ ...prev, [drugId]: value }))
  }

  const fillVisibleFromSystem = () => {
    setCountInputs(prev => {
      const next = { ...prev }
      for (const drug of filteredDrugs) next[drug.id] = String(drug.stock)
      return next
    })
  }

  const clearDraft = () => {
    setCountInputs({})
    setNote('')
  }

  const handleSave = async () => {
    if (draftItems.length === 0) {
      showToast('กรุณากรอกจำนวนที่นับได้อย่างน้อย 1 รายการ', 'error')
      return
    }
    if (!window.confirm(`ยืนยันบันทึกรอบตรวจนับ ${draftItems.length} รายการ?`)) return

    setSaving(true)
    try {
      const saved = await createStockCount({
        note,
        items: draftItems.map(item => ({
          drug_id: item.drug.id,
          counted: item.counted,
        })),
      })
      showToast(`บันทึก ${saved.count_no} สำเร็จ`, 'success')
      setCounts(prev => [saved, ...prev].slice(0, 20))
      clearDraft()
      await reload()
    } catch (e) {
      showToast((e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-800">ตรวจนับสต็อก</h1>
          <p className="text-xs text-gray-400 mt-0.5">บันทึกยอดนับจริงและสร้าง adjustment audit อัตโนมัติ</p>
        </div>
        <div className="flex-1" />
        <Button variant="secondary" onClick={fillVisibleFromSystem}>เติมตามระบบ</Button>
        <Button variant="secondary" onClick={clearDraft}>ล้าง</Button>
        <Button onClick={handleSave} disabled={saving || draftItems.length === 0}>
          {saving ? 'กำลังบันทึก…' : 'บันทึกรอบตรวจนับ'}
        </Button>
      </div>

      <div className="p-6 grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4 overflow-auto">
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-64">
              <label className="block text-xs font-medium text-gray-500 mb-1">ค้นหายา</label>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ชื่อยา / ชื่อสามัญ / บาร์โค้ด"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
            <div className="min-w-72">
              <label className="block text-xs font-medium text-gray-500 mb-1">หมายเหตุ</label>
              <input
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="เช่น ตรวจนับประจำเดือน"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold text-gray-500">ยา</th>
                  <th className="text-right px-4 py-2 font-semibold text-gray-500">ในระบบ</th>
                  <th className="text-right px-4 py-2 font-semibold text-gray-500">นับได้</th>
                  <th className="text-right px-4 py-2 font-semibold text-gray-500">ต่าง</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrugs.map(drug => {
                  const raw = countInputs[drug.id] ?? ''
                  const counted = raw === '' ? null : Number(raw)
                  const delta = counted == null || !Number.isFinite(counted) ? 0 : counted - drug.stock
                  return (
                    <tr key={drug.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <div className="font-medium text-gray-800">{drug.name}</div>
                        <div className="text-xs text-gray-400">{drug.generic_name || '—'} · {drug.unit}</div>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{drug.stock}</td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          value={raw}
                          onChange={e => setCount(drug.id, e.target.value)}
                          className="w-28 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none focus:border-blue-400"
                        />
                      </td>
                      <td className={`px-4 py-2 text-right tabular-nums font-medium ${
                        delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-gray-400'
                      }`}>
                        {raw === '' ? '—' : delta > 0 ? `+${delta}` : delta}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">สรุปร่าง</h2>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-bold text-gray-800">{draftItems.length}</div>
                <div className="text-xs text-gray-400">รายการนับ</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-800">{changedItems.length}</div>
                <div className="text-xs text-gray-400">มีส่วนต่าง</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-800">{totalAbsDelta}</div>
                <div className="text-xs text-gray-400">รวมต่าง</div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">ประวัติล่าสุด</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {counts.length === 0 && (
                <div className="p-4 text-sm text-gray-400 text-center">ยังไม่มีประวัติ</div>
              )}
              {counts.map(count => {
                const changed = count.items.filter(item => item.delta !== 0).length
                return (
                  <div key={count.id} className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-gray-800">{count.count_no}</div>
                      <div className="text-xs text-gray-400">{fmtDateTime(count.created_at)}</div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {count.items.length} รายการ · ปรับจริง {changed} รายการ
                    </div>
                    {count.note && <div className="text-xs text-gray-400 mt-1">{count.note}</div>}
                  </div>
                )
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
