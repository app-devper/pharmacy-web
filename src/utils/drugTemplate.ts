import * as XLSX from 'xlsx'

/**
 * Downloads a pre-formatted Excel template for bulk drug import.
 * Column order must stay in sync with parseImportFile() in ImportDrugsModal.
 */
export function downloadDrugTemplate() {
  const headers = [
    'ชื่อการค้า*',
    'ชื่อสามัญ',
    'ประเภท',
    'ขนาดยา',
    'บาร์โค้ด',
    'ราคาทุน',
    'ราคาขาย',
    'จำนวนสต็อก',
    'แจ้งเตือนสต็อก≤',
    'เลขทะเบียน',
    'หน่วย',
    'รายงาน ขย.',
  ]

  // One example row so the user knows the expected format
  const example = [
    'พาราเซตามอล 500mg',
    'Paracetamol',
    'ยาสามัญ',
    '500mg',
    '',
    2,
    5,
    100,
    20,
    '1A 12/53',
    'เม็ด',
    'ky9',
  ]

  const ws = XLSX.utils.aoa_to_sheet([headers, example])

  // Column widths
  ws['!cols'] = headers.map((_, i) => ({ wch: i === 0 ? 28 : 15 }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'ยา')
  XLSX.writeFile(wb, 'drug_import_template.xlsx')
}
