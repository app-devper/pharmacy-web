import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { bulkImportDrugs, type BulkImportRowError } from '../../api/drugs'
import { downloadDrugTemplate } from '../../utils/drugTemplate'
import { useToast } from '../../hooks/useToast'
import type { DrugInput } from '../../types/drug'

interface Props {
  onClose: () => void
  onImported: () => void
}

type Step = 'idle' | 'preview' | 'result'

const PREVIEW_LIMIT = 20

// Column mapping — must stay in sync with downloadDrugTemplate()
// A=name, B=generic_name, C=type, D=strength, E=barcode,
// F=cost_price, G=sell_price, H=stock, I=min_stock,
// J=reg_no, K=unit, L=report_types
function rowToDrugInput(r: unknown[]): DrugInput {
  const str = (v: unknown) => (v != null && v !== '' ? String(v).trim() : '')
  const num = (v: unknown) => Number(v) || 0
  return {
    name:         str(r[0]),
    generic_name: str(r[1]),
    type:         str(r[2]) || 'ยาสามัญ',
    strength:     str(r[3]),
    barcode:      str(r[4]),
    cost_price:   num(r[5]),
    sell_price:   num(r[6]),
    stock:        num(r[7]),
    min_stock:    num(r[8]),
    reg_no:       str(r[9]),
    unit:         str(r[10]) || 'เม็ด',
    report_types: str(r[11])
      ? str(r[11]).split(',').map(s => s.trim()).filter(Boolean)
      : [],
  }
}

function parseExcelFile(file: File): Promise<DrugInput[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 }) as unknown[][]
        // row 0 = headers, rows 1+ = data; skip rows where column A is empty
        const drugs = rows
          .slice(1)
          .filter(r => r[0] != null && String(r[0]).trim() !== '')
          .map(rowToDrugInput)
        resolve(drugs)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('อ่านไฟล์ไม่สำเร็จ'))
    reader.readAsArrayBuffer(file)
  })
}

export default function ImportDrugsModal({ onClose, onImported }: Props) {
  const showToast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('idle')
  const [drugs, setDrugs] = useState<DrugInput[]>([])
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [imported, setImported] = useState(0)
  const [errors, setErrors] = useState<BulkImportRowError[]>([])
  const [dragOver, setDragOver] = useState(false)

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      showToast('รองรับเฉพาะไฟล์ .xlsx, .xls, .csv', 'error')
      return
    }
    try {
      const parsed = await parseExcelFile(file)
      if (parsed.length === 0) {
        showToast('ไม่พบข้อมูลในไฟล์', 'error')
        return
      }
      setDrugs(parsed)
      setFileName(file.name)
      setStep('preview')
    } catch {
      showToast('ไม่สามารถอ่านไฟล์ได้', 'error')
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
    try {
      const result = await bulkImportDrugs(drugs)
      setImported(result.imported)
      setErrors(result.errors)
      setStep('result')
      if (result.imported > 0) onImported()
    } catch (e: unknown) {
      showToast((e as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // ── IDLE ──────────────────────────────────────────────────────────
  if (step === 'idle') {
    return (
      <Modal title="นำเข้ายาจาก Excel" onClose={onClose}>
        <div className="space-y-4">
          {/* Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
            }`}
          >
            <div className="text-4xl mb-3">📂</div>
            <p className="text-sm font-medium text-gray-700">คลิกเพื่อเลือกไฟล์ หรือลากวางที่นี่</p>
            <p className="text-xs text-gray-400 mt-1">รองรับ .xlsx, .xls, .csv</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />

          {/* Template download */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-700">ดาวน์โหลด Template</p>
              <p className="text-xs text-gray-400">ไฟล์ตัวอย่างพร้อม header และข้อมูลตัวอย่าง 1 แถว</p>
            </div>
            <Button variant="secondary" onClick={downloadDrugTemplate}
              className="border-green-300 text-green-700 hover:bg-green-50 shrink-0">
              ⬇ Template
            </Button>
          </div>

          <Button variant="secondary" className="w-full" onClick={onClose}>ปิด</Button>
        </div>
      </Modal>
    )
  }

  // ── PREVIEW ───────────────────────────────────────────────────────
  if (step === 'preview') {
    const preview = drugs.slice(0, PREVIEW_LIMIT)
    return (
      <Modal title={`ตรวจสอบข้อมูล — ${fileName}`} onClose={onClose}>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full">
              {drugs.length} รายการ
            </span>
            {drugs.length > PREVIEW_LIMIT && (
              <span className="text-xs text-gray-400">
                แสดง {PREVIEW_LIMIT} รายการแรก
              </span>
            )}
          </div>

          {/* Preview table */}
          <div className="overflow-auto max-h-72 rounded-lg border border-gray-200">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">#</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">ชื่อการค้า</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">ประเภท</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">ราคาขาย</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">สต็อก</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">บาร์โค้ด</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((d, i) => (
                  <tr key={i} className={`border-t border-gray-100 ${!d.name ? 'bg-red-50' : ''}`}>
                    <td className="px-3 py-1.5 text-gray-400">{i + 2}</td>
                    <td className="px-3 py-1.5">
                      {d.name
                        ? <span className="font-medium text-gray-800">{d.name}</span>
                        : <span className="text-red-500 italic">ว่าง</span>
                      }
                      {d.generic_name && <span className="text-gray-400 ml-1">{d.generic_name}</span>}
                    </td>
                    <td className="px-3 py-1.5 text-gray-600">{d.type}</td>
                    <td className="px-3 py-1.5 text-right text-gray-700">฿{d.sell_price}</td>
                    <td className="px-3 py-1.5 text-right text-gray-700">{d.stock}</td>
                    <td className="px-3 py-1.5 text-gray-400">{d.barcode || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setStep('idle')} disabled={loading}>
              ← เลือกไฟล์ใหม่
            </Button>
            <Button className="flex-1" onClick={handleImport} disabled={loading}>
              {loading ? 'กำลังนำเข้า...' : `นำเข้า ${drugs.length} รายการ`}
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
        {/* Summary badges */}
        <div className="flex gap-3">
          <div className="flex-1 bg-green-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{imported}</div>
            <div className="text-xs text-green-700 mt-0.5">นำเข้าสำเร็จ</div>
          </div>
          <div className="flex-1 bg-red-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-red-500">{errors.length}</div>
            <div className="text-xs text-red-600 mt-0.5">มีข้อผิดพลาด</div>
          </div>
        </div>

        {/* Error table */}
        {errors.length > 0 && (
          <div className="overflow-auto max-h-56 rounded-lg border border-red-100">
            <table className="w-full text-xs">
              <thead className="bg-red-50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-red-700">แถว</th>
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
            <Button variant="secondary" className="flex-1" onClick={() => setStep('idle')}>
              นำเข้าเพิ่มเติม
            </Button>
          )}
          <Button className="flex-1" onClick={onClose}>ปิด</Button>
        </div>
      </div>
    </Modal>
  )
}
