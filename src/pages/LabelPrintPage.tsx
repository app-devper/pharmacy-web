import { useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { getLots } from '../api/drugs'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import { useSettings } from '../context/SettingsContext'
import { useDrugs } from '../hooks/useDrugs'
import { useToast } from '../hooks/useToast'
import type { Drug, DrugLot } from '../types/drug'
import { getDrugSellPrice } from '../types/drug'
import { printBarcodeLabels } from '../utils/printBarcodeLabels'

interface LabelLine {
  id: string
  drugId: string
  lotId: string
  barcode: string
  copies: string
  includePrice: boolean
}

const newLine = (): LabelLine => ({
  id: crypto.randomUUID?.() ?? String(Date.now()),
  drugId: '',
  lotId: '',
  barcode: '',
  copies: '1',
  includePrice: true,
})

export default function LabelPrintPage() {
  const { drugs, loading } = useDrugs()
  const { settings } = useSettings()
  const showToast = useToast()
  const [search, setSearch] = useState('')
  const [size, setSize] = useState<'small' | 'medium'>('small')
  const [lines, setLines] = useState<LabelLine[]>(() => [newLine()])
  const [lotsByDrug, setLotsByDrug] = useState<Record<string, DrugLot[]>>({})

  const drugsById = useMemo(() => new Map(drugs.map(drug => [drug.id, drug])), [drugs])
  const listRef = useRef<HTMLDivElement>(null)

  const filteredDrugs = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return drugs
    return drugs.filter(drug =>
      drug.name.toLowerCase().includes(q) ||
      drug.generic_name.toLowerCase().includes(q) ||
      drug.barcode.includes(q)
    )
  }, [drugs, search])

  // Virtualize the drug-picker list — only render rows inside the viewport
  // (+ overscan). Handles thousands of drugs without sluggish initial render.
  const rowVirtualizer = useVirtualizer({
    count: filteredDrugs.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 64,    // matches px-4 py-3 + 2 lines of text
    overscan: 8,
  })

  useEffect(() => {
    const ids = Array.from(new Set(lines.map(line => line.drugId).filter(Boolean)))
    ids.forEach(async drugId => {
      if (lotsByDrug[drugId]) return
      try {
        const lots = await getLots(drugId)
        setLotsByDrug(prev => ({ ...prev, [drugId]: lots }))
      } catch (e) {
        showToast((e as Error).message, 'error')
      }
    })
  }, [lines, lotsByDrug, showToast])

  const updateLine = (id: string, patch: Partial<LabelLine>) => {
    setLines(prev => prev.map(line => line.id === id ? { ...line, ...patch } : line))
  }

  const addDrugLine = (drug: Drug) => {
    setLines(prev => [
      ...prev,
      {
        ...newLine(),
        drugId: drug.id,
        barcode: drug.barcode || drug.id,
      },
    ])
  }

  const removeLine = (id: string) => {
    setLines(prev => prev.length <= 1 ? [newLine()] : prev.filter(line => line.id !== id))
  }

  const printableLabels = lines.flatMap(line => {
    const drug = drugsById.get(line.drugId)
    if (!drug) return []
    const copies = Number(line.copies)
    if (!Number.isInteger(copies) || copies <= 0) return []
    const lot = (lotsByDrug[line.drugId] ?? []).find(item => item.id === line.lotId)
    const barcode = line.barcode.trim() || drug.barcode || drug.id
    return [{
      name: drug.name,
      barcode,
      price: line.includePrice ? getDrugSellPrice(drug) : undefined,
      unit: drug.unit,
      lotNumber: lot?.lot_number,
      expiryDate: lot?.expiry_date,
      copies,
    }]
  })

  const totalCopies = printableLabels.reduce((sum, label) => sum + label.copies, 0)

  const handlePrint = () => {
    if (printableLabels.length === 0) {
      showToast('กรุณาเลือกยาและจำนวนฉลาก', 'error')
      return
    }
    printBarcodeLabels({
      labels: printableLabels,
      size,
      shopName: settings.store.name || 'ร้านยา',
    })
  }

  if (loading) return <Spinner />

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-800">พิมพ์ฉลากบาร์โค้ด</h1>
          <p className="text-xs text-gray-400 mt-0.5">เลือกยา ล็อต จำนวนดวง และพิมพ์ฉลาก Code 128</p>
        </div>
        <div className="flex-1" />
        <select
          value={size}
          onChange={e => setSize(e.target.value as 'small' | 'medium')}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
        >
          <option value="small">38 × 25 มม.</option>
          <option value="medium">50 × 30 มม.</option>
        </select>
        <Button onClick={handlePrint} disabled={totalCopies === 0}>
          พิมพ์ {totalCopies > 0 ? `${totalCopies} ดวง` : ''}
        </Button>
      </div>

      <div className="p-6 grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4 flex-1 min-h-0 overflow-auto xl:overflow-hidden">
        <aside className="bg-white border border-gray-100 rounded-xl overflow-hidden flex flex-col min-h-0">
          <div className="p-4 border-b border-gray-100 shrink-0">
            <label className="block text-xs font-medium text-gray-500 mb-1">ค้นหายา</label>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ชื่อยา / ชื่อสามัญ / บาร์โค้ด"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
          <div ref={listRef} className="flex-1 min-h-0 overflow-auto">
            <div
              className="relative w-full"
              style={{ height: rowVirtualizer.getTotalSize() }}
            >
              {rowVirtualizer.getVirtualItems().map(virtualRow => {
                const drug = filteredDrugs[virtualRow.index]
                return (
                  <button
                    key={drug.id}
                    onClick={() => addDrugLine(drug)}
                    ref={rowVirtualizer.measureElement}
                    data-index={virtualRow.index}
                    className="absolute top-0 left-0 w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50"
                    style={{ transform: `translateY(${virtualRow.start}px)` }}
                  >
                    <div className="font-medium text-gray-800">{drug.name}</div>
                    <div className="text-xs text-gray-400">
                      {drug.barcode || 'ไม่มีบาร์โค้ด'} · ฿{getDrugSellPrice(drug).toLocaleString()} · stock {drug.stock}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </aside>

        <main className="bg-white border border-gray-100 rounded-xl overflow-hidden flex flex-col min-h-0">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center shrink-0">
            <h2 className="text-sm font-semibold text-gray-700">รายการฉลาก</h2>
            <div className="flex-1" />
            <Button variant="secondary" onClick={() => setLines(prev => [...prev, newLine()])}>เพิ่มแถวว่าง</Button>
          </div>

          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold text-gray-500">ยา</th>
                  <th className="text-left px-4 py-2 font-semibold text-gray-500">ล็อต</th>
                  <th className="text-left px-4 py-2 font-semibold text-gray-500">บาร์โค้ด</th>
                  <th className="text-right px-4 py-2 font-semibold text-gray-500">จำนวน</th>
                  <th className="text-center px-4 py-2 font-semibold text-gray-500">ราคา</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {lines.map(line => {
                  const lots = lotsByDrug[line.drugId] ?? []
                  return (
                    <tr key={line.id} className="border-b border-gray-50">
                      <td className="px-4 py-2 min-w-64">
                        <select
                          value={line.drugId}
                          onChange={e => {
                            const drug = drugsById.get(e.target.value)
                            updateLine(line.id, {
                              drugId: e.target.value,
                              lotId: '',
                              barcode: drug?.barcode || drug?.id || '',
                            })
                          }}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400"
                        >
                          <option value="">เลือกยา</option>
                          {drugs.map(drug => <option key={drug.id} value={drug.id}>{drug.name}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2 min-w-48">
                        <select
                          value={line.lotId}
                          onChange={e => updateLine(line.id, { lotId: e.target.value })}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400"
                        >
                          <option value="">ไม่ระบุล็อต</option>
                          {lots.map(lot => (
                            <option key={lot.id} value={lot.id}>
                              {lot.lot_number} · เหลือ {lot.remaining}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2 min-w-48">
                        <input
                          value={line.barcode}
                          onChange={e => updateLine(line.id, { barcode: e.target.value })}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-mono focus:outline-none focus:border-blue-400"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          min={1}
                          value={line.copies}
                          onChange={e => updateLine(line.id, { copies: e.target.value })}
                          className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:border-blue-400"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={line.includePrice}
                          onChange={e => updateLine(line.id, { includePrice: e.target.checked })}
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => removeLine(line.id)}
                          className="text-xs text-red-500 hover:text-red-700 hover:underline"
                        >
                          ลบ
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  )
}
