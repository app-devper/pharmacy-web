import * as XLSX from 'xlsx'
import type { Drug } from '../types/drug'
import { getDrugSellPrice } from '../types/drug'
import type { Ky9, Ky10, Ky11, Ky12 } from '../types/kyforms'
import type { EodReport } from '../types/report'
import type { ProfitReport } from '../types/profitReport'
import type { ExpiringLot } from '../api/lots'

function save(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename)
}

function make(rows: Record<string, unknown>[], sheetName: string): XLSX.WorkBook {
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  return wb
}

// ─── Expiry ──────────────────────────────────────────────────────────────────

export function exportExpiryXlsx(lots: ExpiringLot[], label: string) {
  const rows = lots.map(l => ({
    'ชื่อยา':     l.drug_name,
    'เลขล็อต':    l.lot_number,
    'วันหมดอายุ': l.expiry_date.slice(0, 10),
    'คงเหลือ':    l.remaining,
    'สถานะ':      l.days_left < 0 ? 'หมดอายุแล้ว' : `อีก ${l.days_left} วัน`,
  }))
  save(make(rows, 'ยาหมดอายุ'), `expiry-${label}-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

// ─── Stock ───────────────────────────────────────────────────────────────────

export function exportStockXlsx(drugs: Drug[]) {
  const rows = drugs.map(d => ({
    'ชื่อยา':       d.name,
    'ชื่อสามัญ':    d.generic_name ?? '',
    'ประเภท':       d.type,
    'ขนาด':         d.strength ?? '',
    'หน่วย':        d.unit,
    'คงเหลือ':      d.stock,
    'แจ้งเตือนเมื่อ≤': d.min_stock > 0 ? d.min_stock : '-',
    'ราคาทุน':      d.cost_price,
    'ราคาขาย':      getDrugSellPrice(d),
    'มูลค่าสต็อก':  getDrugSellPrice(d) * d.stock,
    'บาร์โค้ด':     d.barcode ?? '',
    'เลขทะเบียน':   d.reg_no ?? '',
  }))
  save(make(rows, 'สต็อกยา'), 'stock.xlsx')
}

// ─── KY 9 ────────────────────────────────────────────────────────────────────

export function exportKy9Xlsx(rows: Ky9[], month: string) {
  const data = rows.map(r => ({
    'วันที่':       r.date,
    'ชื่อยา':       r.drug_name,
    'ทะเบียน':      r.reg_no,
    'หน่วย':        r.unit,
    'จำนวน':        r.qty,
    'ราคา/หน่วย':   r.price_per_unit,
    'มูลค่า':       r.total_value,
    'ผู้ขาย/บริษัท': r.seller,
    'เลขใบส่งของ':  r.invoice_no,
  }))
  save(make(data, 'ขย.9 บัญชีซื้อยา'), `ky9-${month}.xlsx`)
}

// ─── KY 10 ───────────────────────────────────────────────────────────────────

export function exportKy10Xlsx(rows: Ky10[], month: string) {
  const data = rows.map(r => ({
    'วันที่':     r.date,
    'ชื่อยา':     r.drug_name,
    'ทะเบียน':    r.reg_no,
    'จำนวน':      r.qty,
    'หน่วย':      r.unit,
    'ชื่อผู้ซื้อ': r.buyer_name,
    'ที่อยู่':    r.buyer_address,
    'เลขใบสั่ง':  r.rx_no,
    'แพทย์':      r.doctor,
    'คงเหลือ':    r.balance,
  }))
  save(make(data, 'ขย.10'), `ky10-${month}.xlsx`)
}

// ─── KY 11 ───────────────────────────────────────────────────────────────────

export function exportKy11Xlsx(rows: Ky11[], month: string) {
  const data = rows.map(r => ({
    'วันที่':          r.date,
    'ชื่อยา':          r.drug_name,
    'ทะเบียน':         r.reg_no,
    'จำนวน':           r.qty,
    'หน่วย':           r.unit,
    'ชื่อผู้รับ':      r.buyer_name,
    'วัตถุประสงค์':    r.purpose,
    'เภสัชกรผู้จ่าย':  r.pharmacist,
  }))
  save(make(data, 'ขย.11'), `ky11-${month}.xlsx`)
}

// ─── KY 12 ───────────────────────────────────────────────────────────────────

export function exportKy12Xlsx(rows: Ky12[], month: string) {
  const data = rows.map(r => ({
    'วันที่':         r.date,
    'เลขใบสั่งแพทย์': r.rx_no,
    'ชื่อผู้ป่วย':    r.patient_name,
    'แพทย์':          r.doctor,
    'สถานพยาบาล':     r.hospital,
    'รายการยา':       r.drug_name,
    'จำนวน':          r.qty,
    'หน่วย':          r.unit,
    'มูลค่า':         r.total_value,
    'สถานะ':          r.status,
  }))
  save(make(data, 'ขย.12'), `ky12-${month}.xlsx`)
}

// ─── EOD (End-of-Day) ─────────────────────────────────────────────────────────

export function exportEodXlsx(report: EodReport) {
  const summary = [
    { 'รายการ': 'วันที่',                        'มูลค่า': report.date },
    { 'รายการ': 'จำนวนบิล',                      'มูลค่า': report.bill_count },
    { 'รายการ': 'ยอดขายรวม (หลังหักส่วนลด)',      'มูลค่า': report.total_sales },
    { 'รายการ': 'ส่วนลดรวม',                     'มูลค่า': report.total_discount },
    { 'รายการ': 'รับเงินรวม',                    'มูลค่า': report.total_received },
    { 'รายการ': 'เงินทอนรวม',                    'มูลค่า': report.total_change },
    { 'รายการ': 'เงินสดในลิ้นชัก (คาดการณ์)',   'มูลค่า': report.net_cash },
  ]
  const bills = report.bills.map(b => ({
    'เลขบิล':   b.bill_no,
    'เวลา':     new Date(b.sold_at).toLocaleTimeString('th-TH'),
    'ลูกค้า':   b.customer_name || '-',
    'ยอดขาย':   b.total,
    'รับเงิน':  b.received,
    'เงินทอน':  b.change,
  }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'สรุปปิดรอบ')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bills), 'รายการบิล')
  save(wb, `eod-${report.date}.xlsx`)
}

// ─── Profit Report ────────────────────────────────────────────────────────────

export function exportProfitXlsx(report: ProfitReport, from: string, to: string) {
  const s = report.summary
  const summary = [
    { 'รายการ': 'ช่วงวันที่',    'มูลค่า': `${from} ถึง ${to}` },
    { 'รายการ': 'จำนวนบิล',      'มูลค่า': s.bills },
    { 'รายการ': 'รายได้รวม',     'มูลค่า': s.revenue },
    { 'รายการ': 'ต้นทุนรวม',     'มูลค่า': s.cost },
    { 'รายการ': 'กำไรสุทธิ',     'มูลค่า': s.profit },
    { 'รายการ': 'Margin (%)',    'มูลค่า': s.margin.toFixed(1) },
  ]
  const byDrug = report.by_drug.map(d => ({
    'ชื่อยา':      d.drug_name,
    'จำนวนขาย':   d.qty_sold,
    'รายได้':      d.revenue,
    'ต้นทุน':      d.cost,
    'กำไร':        d.profit,
    'Margin (%)':  parseFloat(d.margin.toFixed(1)),
  }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'สรุปกำไร')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(byDrug), 'แยกตามยา')
  save(wb, `profit-${from}-${to}.xlsx`)
}
