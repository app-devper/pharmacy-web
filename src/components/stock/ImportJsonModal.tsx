import { useState, useRef } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { bulkImportDrugs, type BulkImportRowError } from '../../api/drugs'
import { useToast } from '../../hooks/useToast'
import type { DrugInput } from '../../types/drug'

interface Props {
  onClose: () => void
  onImported: () => void
}

type Step = 'idle' | 'preview' | 'result'

const PREVIEW_LIMIT = 20
const BATCH = 1000 // backend limit

// Shape of a single record in aigx.products.json (MongoDB export)
type AigxProduct = {
  name?: string
  nameEn?: string
  description?: string
  price?: number
  costPrice?: number
  unit?: string
  serialNumber?: string
  quantity?: number
  category?: string
}

function mapToDrugInput(p: AigxProduct): DrugInput {
  return {
    name:         (p.name ?? '').trim(),
    generic_name: ((p.nameEn || p.description) ?? '').trim(),
    type:         (p.category || '').trim() || 'ยาสามัญ',
    strength:     '',
    barcode:      (p.serialNumber ?? '').trim(),
    sell_price:   Math.max(0, +(p.price ?? 0) || 0),
    cost_price:   Math.max(0, +(p.costPrice ?? 0) || 0),
    stock:        Math.max(0, Math.floor(+(p.quantity ?? 0) || 0)),
    min_stock:    0,
    reg_no:       '',
    unit:         (p.unit ?? '').trim() || 'ชิ้น',
    report_types: [],
  }
}

function parseJsonFile(file: File): Promise<DrugInput[]> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = e => {
      try {
        const raw = JSON.parse(e.target!.result as string) as AigxProduct[]
        if (!Array.isArray(raw)) throw new Error('ไฟล์ JSON ต้องเป็น array')
        const drugs = raw
          .filter(p => (p.name ?? '').trim() !== '')
          .map(mapToDrugInput)
        resolve(drugs)
      } catch (err) {
        reject(err instanceof Error ? err : new Error('parse error'))
      }
    }
    r.onerror = () => reject(new Error('อ่านไฟล์ไม่สำเร็จ'))
    r.readAsText(file, 'utf-8')
  })
}

export default function ImportJsonModal({ onClose, onImported }: Props) {
  const showToast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('idle')
  const [drugs, setDrugs] = useState<DrugInput[]>([])
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [imported, setImported] = useState(0)
  const [errors, setErrors] = useState<BulkImportRowError[]>([])
  const [dragOver, setDragOver] = useState(false)

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.json$/i)) {
      showToast('รองรับเฉพาะไฟล์ .json', 'error')
      return
    }
    try {
      const parsed = await parseJsonFile(file)
      if (parsed.length === 0) {
        showToast('ไม่พบข้อมูลในไฟล์', 'error')
        return
      }
      setDrugs(parsed)
      setFileName(file.name)
      setStep('preview')
    } catch (e) {
      showToast((e as Error).message || 'ไม่สามารถอ่านไฟล์ได้', 'error')
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleImport = async () => {
    setLoading(true)
    setProgress({ done: 0, total: drugs.length })
    let totalImported = 0
    const allErrors: BulkImportRowError[] = []
    try {
      for (let i = 0; i < drugs.length; i += BATCH) {
        const chunk = drugs.slice(i, i + BATCH)
        const res = await bulkImportDrugs(chunk)
        totalImported += res.imported
        // Re-map row numbers to absolute position in the source file
        // Backend reports row starting at 2 (row 1 = header for Excel); for JSON we
        // adjust to the record index: row = (i + (e.row - 2)) + 1 → simpler: i + e.row - 1
        res.errors.forEach(e => allErrors.push({ ...e, row: i + e.row - 1 }))
        setProgress({ done: Math.min(i + chunk.length, drugs.length), total: drugs.length })
      }
      setImported(totalImported)
      setErrors(allErrors)
      setStep('result')
      if (totalImported > 0) onImported()
    } catch (e: unknown) {
      showToast((e as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // ── IDLE ──────────────────────────────────────────────────────────
  if (step === 'idle') {
    return (
      <Modal title="นำเข้ายาจาก JSON" onClose={onClose}>
        <div className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-amber-300 hover:bg-gray-50'
            }`}
          >
            <div className="text-4xl mb-3">📄</div>
            <p className="text-sm font-medium text-gray-700">คลิกเพื่อเลือกไฟล์ หรือลากวางที่นี่</p>
            <p className="text-xs text-gray-400 mt-1">รองรับ .json (array of products)</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />

          <div className="bg-gray-50 rounded-xl px-4 py-3">
            <p className="text-xs font-medium text-gray-600 mb-1.5">Field mapping</p>
            <ul className="text-xs text-gray-500 space-y-0.5">
              <li><span className="font-mono text-gray-700">name</span> → ชื่อการค้า</li>
              <li><span className="font-mono text-gray-700">nameEn / description</span> → ชื่อสามัญ</li>
              <li><span className="font-mono text-gray-700">price / costPrice</span> → ราคาขาย / ต้นทุน</li>
              <li><span className="font-mono text-gray-700">serialNumber</span> → บาร์โค้ด</li>
              <li><span className="font-mono text-gray-700">quantity</span> → สต็อก (ไม่สร้างล็อต)</li>
              <li><span className="font-mono text-gray-700">unit / category</span> → หน่วย / ประเภท</li>
            </ul>
          </div>

          <Button variant="secondary" className="w-full" onClick={onClose}>ปิด</Button>
        </div>
      </Modal>
    )
  }

  // ── PREVIEW ───────────────────────────────────────────────────────
  if (step === 'preview') {
    const preview = drugs.slice(0, PREVIEW_LIMIT)
    const withStock = drugs.filter(d => d.stock > 0).length
    return (
      <Modal title={`ตรวจสอบข้อมูล — ${fileName}`} onClose={onClose}>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-sm font-semibold rounded-full">
              {drugs.length.toLocaleString()} รายการ
            </span>
            {withStock > 0 && (
              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                มีสต็อก {withStock.toLocaleString()} รายการ
              </span>
            )}
            {drugs.length > PREVIEW_LIMIT && (
              <span className="text-xs text-gray-400">
                แสดง {PREVIEW_LIMIT} รายการแรก
              </span>
            )}
          </div>

          {withStock > 0 && (
            <div className="flex gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-700">
              <span aria-hidden="true">ℹ</span>
              <span>ยาที่มีสต็อก {'>'} 0 จะถูกสร้างโดยยังไม่มีล็อต — กรุณาเพิ่มล็อตในหน้ารายการยาเพื่อให้ระบบ FEFO ทำงานถูกต้อง</span>
            </div>
          )}

          <div className="overflow-auto max-h-72 rounded-lg border border-gray-200">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">#</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">ชื่อการค้า</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">ราคาขาย</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">สต็อก</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">บาร์โค้ด</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((d, i) => (
                  <tr key={i} className={`border-t border-gray-100 ${!d.name ? 'bg-red-50' : ''}`}>
                    <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                    <td className="px-3 py-1.5">
                      {d.name
                        ? <span className="font-medium text-gray-800">{d.name}</span>
                        : <span className="text-red-500 italic">ว่าง</span>
                      }
                      {d.generic_name && <div className="text-gray-400 text-[11px] truncate max-w-[240px]">{d.generic_name}</div>}
                    </td>
                    <td className="px-3 py-1.5 text-right text-gray-700">฿{d.sell_price.toLocaleString()}</td>
                    <td className={`px-3 py-1.5 text-right ${d.stock > 0 ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                      {d.stock}
                    </td>
                    <td className="px-3 py-1.5 text-gray-400 font-mono">{d.barcode || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {loading && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700">
              กำลังนำเข้า {progress.done.toLocaleString()} / {progress.total.toLocaleString()} …
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setStep('idle')} disabled={loading}>
              ← เลือกไฟล์ใหม่
            </Button>
            <Button className="flex-1" onClick={handleImport} disabled={loading}>
              {loading ? 'กำลังนำเข้า…' : `นำเข้า ${drugs.length.toLocaleString()} รายการ`}
            </Button>
          </div>
        </div>
      </Modal>
    )
  }

  // ── RESULT ────────────────────────────────────────────────────────
  return (
    <Modal title="ผลการนำเข้า" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="flex-1 bg-green-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{imported.toLocaleString()}</div>
            <div className="text-xs text-green-700 mt-0.5">นำเข้าสำเร็จ</div>
          </div>
          <div className="flex-1 bg-red-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-red-500">{errors.length.toLocaleString()}</div>
            <div className="text-xs text-red-600 mt-0.5">มีข้อผิดพลาด</div>
          </div>
        </div>

        {errors.length > 0 && (
          <div className="overflow-auto max-h-56 rounded-lg border border-red-100">
            <table className="w-full text-xs">
              <thead className="bg-red-50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-red-700">#</th>
                  <th className="text-left px-3 py-2 font-medium text-red-700">ชื่อยา</th>
                  <th className="text-left px-3 py-2 font-medium text-red-700">สาเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((e, i) => (
                  <tr key={i} className="border-t border-red-50">
                    <td className="px-3 py-1.5 text-gray-500">{e.row}</td>
                    <td className="px-3 py-1.5 font-medium text-gray-700">{e.name}</td>
                    <td className="px-3 py-1.5 text-red-600">{e.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex gap-2">
          {imported > 0 && (
            <Button variant="secondary" className="flex-1" onClick={() => { setStep('idle'); setDrugs([]); setErrors([]); setImported(0) }}>
              นำเข้าเพิ่มเติม
            </Button>
          )}
          <Button className="flex-1" onClick={onClose}>ปิด</Button>
        </div>
      </div>
    </Modal>
  )
}
