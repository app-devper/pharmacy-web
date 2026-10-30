import * as XLSX from 'xlsx'
import { downloadDrugTemplate } from '../../utils/drugTemplate'
import type { DraftDefaults, DrugDraft } from '../../lib/drugDraft'
import { DRUG_DEFAULTS } from '../../lib/drugDraft'
import type { ImportRow } from '../../lib/drugImport'

/** A file format the drug import reads: how a file becomes rows, and how the modal describes it. */
export interface DrugImportFormat {
  title: string
  icon: string
  /** The file input's accept attribute. */
  accept: string
  pattern: RegExp
  unsupported: string
  dropHint: string
  defaults: DraftDefaults
  /** Source field → drug field, shown under the drop zone. */
  mapping?: [string, string][]
  /** Offers a template file to fill in. */
  template?: () => void
  read(file: File): Promise<ImportRow[]>
}

function readFile(file: File, as: 'text' | 'buffer'): Promise<string | ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target!.result as string | ArrayBuffer)
    reader.onerror = () => reject(new Error('อ่านไฟล์ไม่สำเร็จ'))
    if (as === 'text') reader.readAsText(file, 'utf-8')
    else reader.readAsArrayBuffer(file)
  })
}

// Column mapping — must stay in sync with downloadDrugTemplate()
// A=name, B=generic_name, C=type, D=strength, E=barcode,
// F=cost_price, G=sell_price, H=stock, I=min_stock,
// J=reg_no, K=unit, L=report_types
function rowToDraft(r: unknown[]): DrugDraft {
  const cell = (i: number) => (r[i] == null ? '' : String(r[i]))
  return {
    name: cell(0), generic_name: cell(1), type: cell(2), strength: cell(3), barcode: cell(4),
    cost_price: cell(5), retail: cell(6), stock: cell(7), min_stock: cell(8),
    reg_no: cell(9), unit: cell(10), report_types: cell(11),
  }
}

/** The drug template sheet (.xlsx, .xls, .csv); row 1 is the header. */
export const excelFormat: DrugImportFormat = {
  title: 'นำเข้ายาจาก Excel',
  icon: '📂',
  accept: '.xlsx,.xls,.csv',
  pattern: /\.(xlsx|xls|csv)$/i,
  unsupported: 'รองรับเฉพาะไฟล์ .xlsx, .xls, .csv',
  dropHint: 'รองรับ .xlsx, .xls, .csv',
  defaults: DRUG_DEFAULTS,
  template: downloadDrugTemplate,
  async read(file) {
    const data = new Uint8Array(await readFile(file, 'buffer') as ArrayBuffer)
    const wb = XLSX.read(data, { type: 'array' })
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1 }) as unknown[][]
    return rows
      .map((r, i) => ({ row: i + 1, r }))
      .slice(1)
      .filter(({ r }) => r[0] != null && String(r[0]).trim() !== '')
      .map(({ row, r }) => ({ row, draft: rowToDraft(r) }))
  },
}

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

/** An aigx products export: a JSON array, one record per product; `row` is the record's number. */
export const aigxJsonFormat: DrugImportFormat = {
  title: 'นำเข้ายาจาก JSON',
  icon: '📄',
  accept: '.json,application/json',
  pattern: /\.json$/i,
  unsupported: 'รองรับเฉพาะไฟล์ .json',
  dropHint: 'รองรับ .json (array of products)',
  // aigx products are mostly non-drug stock, so they default to 'ชิ้น'.
  defaults: { type: 'ยาสามัญ', unit: 'ชิ้น' },
  mapping: [
    ['name', 'ชื่อการค้า'],
    ['nameEn / description', 'ชื่อสามัญ'],
    ['price / costPrice', 'ราคาขาย / ต้นทุน'],
    ['serialNumber', 'บาร์โค้ด'],
    ['quantity', 'สต็อก (เข้าล็อตเปิดยอด)'],
    ['unit / category', 'หน่วย / ประเภท'],
  ],
  async read(file) {
    const raw = JSON.parse(await readFile(file, 'text') as string) as unknown
    if (!Array.isArray(raw)) throw new Error('ไฟล์ JSON ต้องเป็น array')
    return (raw as AigxProduct[])
      .map((p, i) => ({ row: i + 1, p }))
      .filter(({ p }) => (p.name ?? '').trim() !== '')
      .map(({ row, p }) => ({
        row,
        draft: {
          name: p.name ?? '',
          generic_name: p.nameEn || p.description || '',
          type: p.category,
          barcode: p.serialNumber,
          retail: p.price,
          cost_price: p.costPrice,
          stock: p.quantity,
          unit: p.unit,
        },
      }))
  },
}
