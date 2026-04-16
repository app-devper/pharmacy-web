import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Drug } from '../types/drug'
import { getDrugSellPrice } from '../types/drug'
import type { Ky9, Ky10, Ky11, Ky12 } from '../types/kyforms'
import type { EodReport } from '../types/report'

// ─── Thai Font Loader ────────────────────────────────────────────────────────
// Sarabun Regular from Google Fonts — fetched once, cached in memory

const FONT_URL =
  'https://fonts.gstatic.com/s/sarabun/v13/DtVmJx26TKEr37c9YK5sulkA.ttf'

let _fontBase64: string | null = null

async function loadFont(): Promise<string> {
  if (_fontBase64) return _fontBase64
  try {
    const res = await fetch(FONT_URL)
    const buf = await res.arrayBuffer()
    const bytes = new Uint8Array(buf)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
    _fontBase64 = btoa(binary)
    return _fontBase64
  } catch {
    return ''   // fallback: use helvetica (Thai will show as boxes but won't crash)
  }
}

// ─── Doc Factory ─────────────────────────────────────────────────────────────

async function makeDoc(landscape = true): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: landscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  })
  const fontData = await loadFont()
  if (fontData) {
    doc.addFileToVFS('Sarabun.ttf', fontData)
    doc.addFont('Sarabun.ttf', 'Sarabun', 'normal')
    doc.setFont('Sarabun')
  }
  return doc
}

const HEAD_COLOR: [number, number, number] = [37, 99, 235]   // blue-600

function tableStyles(font: string) {
  return {
    styles:     { font, fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: HEAD_COLOR, textColor: 255, fontStyle: 'bold' as const },
    alternateRowStyles: { fillColor: [248, 250, 252] as [number, number, number] },
  }
}

// ─── Stock ───────────────────────────────────────────────────────────────────

export async function exportStockPdf(drugs: Drug[]) {
  const doc  = await makeDoc(true)
  const font = _fontBase64 ? 'Sarabun' : 'helvetica'

  doc.setFont(font).setFontSize(13).text('รายการสต็อกยา', 14, 13)

  autoTable(doc, {
    head: [['ชื่อยา', 'ชื่อสามัญ', 'ประเภท', 'หน่วย', 'คงเหลือ', 'แจ้งเตือน≤', 'ราคาขาย', 'มูลค่าสต็อก']],
    body: drugs.map(d => [
      d.name,
      d.generic_name ?? '',
      d.type,
      d.unit,
      d.stock,
      d.min_stock > 0 ? d.min_stock : '-',
      getDrugSellPrice(d).toLocaleString('th-TH'),
      (getDrugSellPrice(d) * d.stock).toLocaleString('th-TH'),
    ]),
    startY: 18,
    ...tableStyles(font),
  })

  doc.save('stock.pdf')
}

// ─── KY 9 ────────────────────────────────────────────────────────────────────

export async function exportKy9Pdf(rows: Ky9[], month: string) {
  const doc  = await makeDoc(true)
  const font = _fontBase64 ? 'Sarabun' : 'helvetica'

  doc.setFont(font).setFontSize(13)
    .text(`ขย.9 บัญชีการซื้อยา${month ? `  (${month})` : ''}`, 14, 13)

  autoTable(doc, {
    head: [['วันที่', 'ชื่อยา', 'ทะเบียน', 'หน่วย', 'จำนวน', 'ราคา/หน่วย', 'มูลค่า', 'ผู้ขาย', 'เลขใบส่งของ']],
    body: rows.map(r => [
      r.date, r.drug_name, r.reg_no, r.unit, r.qty,
      r.price_per_unit.toLocaleString('th-TH'),
      r.total_value.toLocaleString('th-TH'),
      r.seller, r.invoice_no,
    ]),
    startY: 18,
    ...tableStyles(font),
  })

  const total = rows.reduce((s, r) => s + r.total_value, 0)
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? 0
  doc.setFont(font).setFontSize(10)
    .text(`รวมมูลค่า: ฿${total.toLocaleString('th-TH')}`, 14, finalY + 6)

  doc.save(`ky9-${month}.pdf`)
}

// ─── KY 10 ───────────────────────────────────────────────────────────────────

export async function exportKy10Pdf(rows: Ky10[], month: string) {
  const doc  = await makeDoc(true)
  const font = _fontBase64 ? 'Sarabun' : 'helvetica'

  doc.setFont(font).setFontSize(13)
    .text(`ขย.10 บัญชีการขายยาควบคุมพิเศษ${month ? `  (${month})` : ''}`, 14, 13)

  autoTable(doc, {
    head: [['วันที่', 'ชื่อยา', 'ทะเบียน', 'จำนวน', 'หน่วย', 'ชื่อผู้ซื้อ', 'ที่อยู่', 'เลขใบสั่ง', 'แพทย์', 'คงเหลือ']],
    body: rows.map(r => [
      r.date, r.drug_name, r.reg_no, r.qty, r.unit,
      r.buyer_name, r.buyer_address, r.rx_no, r.doctor, r.balance,
    ]),
    startY: 18,
    ...tableStyles(font),
  })

  doc.save(`ky10-${month}.pdf`)
}

// ─── KY 11 ───────────────────────────────────────────────────────────────────

export async function exportKy11Pdf(rows: Ky11[], month: string) {
  const doc  = await makeDoc(true)
  const font = _fontBase64 ? 'Sarabun' : 'helvetica'

  doc.setFont(font).setFontSize(13)
    .text(`ขย.11 บัญชีการขายยาอันตราย${month ? `  (${month})` : ''}`, 14, 13)

  autoTable(doc, {
    head: [['วันที่', 'ชื่อยา', 'ทะเบียน', 'จำนวน', 'หน่วย', 'ชื่อผู้รับ', 'วัตถุประสงค์', 'เภสัชกรผู้จ่าย']],
    body: rows.map(r => [
      r.date, r.drug_name, r.reg_no, r.qty, r.unit,
      r.buyer_name, r.purpose, r.pharmacist,
    ]),
    startY: 18,
    ...tableStyles(font),
  })

  doc.save(`ky11-${month}.pdf`)
}

// ─── KY 12 ───────────────────────────────────────────────────────────────────

export async function exportKy12Pdf(rows: Ky12[], month: string) {
  const doc  = await makeDoc(true)
  const font = _fontBase64 ? 'Sarabun' : 'helvetica'

  doc.setFont(font).setFontSize(13)
    .text(`ขย.12 บัญชีการขายยาตามใบสั่งแพทย์${month ? `  (${month})` : ''}`, 14, 13)

  autoTable(doc, {
    head: [['วันที่', 'เลขใบสั่ง', 'ชื่อผู้ป่วย', 'แพทย์', 'สถานพยาบาล', 'รายการยา', 'จำนวน', 'หน่วย', 'มูลค่า', 'สถานะ']],
    body: rows.map(r => [
      r.date, r.rx_no, r.patient_name, r.doctor, r.hospital,
      r.drug_name, r.qty, r.unit,
      r.total_value.toLocaleString('th-TH'),
      r.status,
    ]),
    startY: 18,
    ...tableStyles(font),
  })

  const total = rows.reduce((s, r) => s + r.total_value, 0)
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? 0
  doc.setFont(font).setFontSize(10)
    .text(`รวมมูลค่า: ฿${total.toLocaleString('th-TH')}`, 14, finalY + 6)

  doc.save(`ky12-${month}.pdf`)
}

// ─── EOD (End-of-Day) ─────────────────────────────────────────────────────────

export async function exportEodPdf(report: EodReport) {
  const doc  = await makeDoc(false)   // portrait A4
  const font = _fontBase64 ? 'Sarabun' : 'helvetica'

  doc.setFont(font).setFontSize(14)
    .text(`สรุปปิดรอบประจำวัน — ${report.date}`, 14, 15)

  // Summary table (plain 2-column)
  autoTable(doc, {
    body: [
      ['จำนวนบิล',                     String(report.bill_count)],
      ['ยอดขายรวม (หลังหักส่วนลด)',    `฿${report.total_sales.toLocaleString('th-TH')}`],
      ['ส่วนลดรวม',                    `฿${report.total_discount.toLocaleString('th-TH')}`],
      ['รับเงินรวม',                   `฿${report.total_received.toLocaleString('th-TH')}`],
      ['เงินทอนรวม',                   `฿${report.total_change.toLocaleString('th-TH')}`],
      ['เงินสดในลิ้นชัก (คาดการณ์)',  `฿${report.net_cash.toLocaleString('th-TH')}`],
    ],
    startY: 20,
    theme: 'plain',
    styles: { font, fontSize: 10 },
    columnStyles: { 1: { halign: 'right' as const } },
  })

  // Bills table
  const afterSummary = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? 70
  doc.setFont(font).setFontSize(11).text('รายการบิลทั้งหมด', 14, afterSummary + 10)

  autoTable(doc, {
    head: [['เลขบิล', 'เวลา', 'ลูกค้า', 'ยอดขาย', 'รับเงิน', 'เงินทอน']],
    body: report.bills.map(b => [
      b.bill_no,
      new Date(b.sold_at).toLocaleTimeString('th-TH'),
      b.customer_name || '-',
      b.total.toLocaleString('th-TH'),
      b.received.toLocaleString('th-TH'),
      b.change.toLocaleString('th-TH'),
    ]),
    startY: afterSummary + 14,
    ...tableStyles(font),
  })

  doc.save(`eod-${report.date}.pdf`)
}
