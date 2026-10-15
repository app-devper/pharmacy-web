import { useState, useRef } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { bulkImportDrugs } from '../../api/drugs'
import { useToast } from '../../hooks/useToast'
import { errorText } from '../../lib/latest'
import { prepareImport, runImport, type ImportLine, type ImportOutcome } from '../../lib/drugImport'
import type { DrugImportFormat } from './importFormats'

interface Props {
  format: DrugImportFormat
  onClose: () => void
  onImported: () => void
}

type Step = 'idle' | 'preview' | 'result'

const PREVIEW_LIMIT = 20

/** Bulk drug import for one file format (lib/drugImport does the work). */
export default function DrugImportModal({ format, onClose, onImported }: Props) {
  const showToast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('idle')
  const [lines, setLines] = useState<ImportLine[]>([])
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = async (file: File) => {
    if (!format.pattern.test(file.name)) {
      showToast(format.unsupported, 'error')
      return
    }
    try {
      const rows = await format.read(file)
      if (rows.length === 0) {
        showToast('ไม่พบข้อมูลในไฟล์', 'error')
        return
      }
      const prepared = prepareImport(rows, format.defaults)
      if (!prepared.ok) {
        showToast(`แถว ${prepared.row}: ${prepared.problem}`, 'error')
        return
      }
      setLines(prepared.lines)
      setFileName(file.name)
      setStep('preview')
    } catch (e) {
      showToast(e instanceof Error && e.message ? e.message : 'ไม่สามารถอ่านไฟล์ได้', 'error')
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
    setProgress({ done: 0, total: lines.length })
    const result = await runImport(lines, bulkImportDrugs, (done, total) => setProgress({ done, total }))
    setLoading(false)
    setOutcome(result)
    setStep('result')
    if (result.imported > 0) onImported()
  }

  const startOver = () => {
    setStep('idle')
    setLines([])
    setOutcome(null)
  }

  // ── IDLE ──────────────────────────────────────────────────────────
  if (step === 'idle') {
    return (
      <Modal title={format.title} onClose={onClose}>
        <div className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
            }`}
          >
            <div className="text-4xl mb-3">{format.icon}</div>
            <p className="text-sm font-medium text-gray-700">คลิกเพื่อเลือกไฟล์ หรือลากวางที่นี่</p>
            <p className="text-xs text-gray-400 mt-1">{format.dropHint}</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={format.accept}
            className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />

          {format.template && (
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-medium text-gray-700">ดาวน์โหลด Template</p>
                <p className="text-xs text-gray-400">ไฟล์ตัวอย่างพร้อม header และข้อมูลตัวอย่าง 1 แถว</p>
              </div>
              <Button variant="secondary" onClick={format.template}
                className="border-green-300 text-green-700 hover:bg-green-50 shrink-0">
                ⬇ Template
              </Button>
            </div>
          )}

          {format.mapping && (
            <div className="bg-gray-50 rounded-xl px-4 py-3">
              <p className="text-xs font-medium text-gray-600 mb-1.5">Field mapping</p>
              <ul className="text-xs text-gray-500 space-y-0.5">
                {format.mapping.map(([from, to]) => (
                  <li key={from}><span className="font-mono text-gray-700">{from}</span> → {to}</li>
                ))}
              </ul>
            </div>
          )}

          <Button variant="secondary" className="w-full" onClick={onClose}>ปิด</Button>
        </div>
      </Modal>
    )
  }

  // ── PREVIEW ───────────────────────────────────────────────────────
  if (step === 'preview') {
    const preview = lines.slice(0, PREVIEW_LIMIT)
    const withStock = lines.filter(l => l.input.stock > 0).length
    return (
      <Modal title={`ตรวจสอบข้อมูล — ${fileName}`} onClose={onClose}>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full">
              {lines.length.toLocaleString()} รายการ
            </span>
            {withStock > 0 && (
              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                มีสต็อก {withStock.toLocaleString()} รายการ
              </span>
            )}
            {lines.length > PREVIEW_LIMIT && (
              <span className="text-xs text-gray-400">แสดง {PREVIEW_LIMIT} รายการแรก</span>
            )}
          </div>

          {withStock > 0 && (
            <div className="flex gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-700">
              <span aria-hidden="true">ℹ</span>
              <span>สต็อกที่นำเข้าจะอยู่ในล็อตเปิดยอด (OPENING, ไม่มีวันหมดอายุ) — เพิ่มล็อตจริงในหน้ารายการยาเพื่อให้ระบบ FEFO ทำงานถูกต้อง</span>
            </div>
          )}

          <div className="overflow-auto max-h-72 rounded-lg border border-gray-200">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">แถว</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">ชื่อการค้า</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">ประเภท</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">ราคาขาย</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">สต็อก</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">บาร์โค้ด</th>
                </tr>
              </thead>
              <tbody>
                {preview.map(({ row, input: d }) => (
                  <tr key={row} className="border-t border-gray-100">
                    <td className="px-3 py-1.5 text-gray-400">{row}</td>
                    <td className="px-3 py-1.5">
                      <span className="font-medium text-gray-800">{d.name}</span>
                      {d.generic_name && <div className="text-gray-400 text-[11px] truncate max-w-[240px]">{d.generic_name}</div>}
                    </td>
                    <td className="px-3 py-1.5 text-gray-600">{d.type}</td>
                    <td className="px-3 py-1.5 text-right text-gray-700">฿{d.sell_price.toLocaleString()}</td>
                    <td className={`px-3 py-1.5 text-right ${d.stock > 0 ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>{d.stock}</td>
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
              {loading ? 'กำลังนำเข้า…' : `นำเข้า ${lines.length.toLocaleString()} รายการ`}
            </Button>
          </div>
        </div>
      </Modal>
    )
  }

  // ── RESULT ────────────────────────────────────────────────────────
  const imported = outcome?.imported ?? 0
  const errors = outcome?.errors ?? []
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

        {outcome?.failure != null && (
          <div role="alert" className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
            การนำเข้าหยุดกลางทาง: {errorText(outcome.failure)} — ยังไม่ได้ส่ง {outcome.notSent.toLocaleString()} รายการ
            (รายการที่นำเข้าสำเร็จแล้วไม่ต้องนำเข้าซ้ำ)
          </div>
        )}

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
            <Button variant="secondary" className="flex-1" onClick={startOver}>
              นำเข้าเพิ่มเติม
            </Button>
          )}
          <Button className="flex-1" onClick={onClose}>ปิด</Button>
        </div>
      </div>
    </Modal>
  )
}
