export interface PrintReceiptOptions {
  billNo:     string
  date:       string
  items:      { name: string; qty: number; price: number }[]
  discount:   number
  total:      number
  received:   number
  change:     number
  paperWidth?: '58mm' | '80mm'   // default 58mm
  shopName?:   string
  shopAddress?: string
}

/**
 * Opens a thermal-printer-friendly popup window and triggers window.print().
 * Works with USB/BT thermal printers configured at 58mm or 80mm paper width.
 */
export function printReceipt(opts: PrintReceiptOptions) {
  const {
    billNo, date, items, discount, total, received, change,
    paperWidth = '58mm',
    shopName    = 'ร้านยา เฮลท์ตี้ฟาร์ม',
    shopAddress = 'อุบลราชธานี',
  } = opts

  const fmt = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const itemRows = items
    .map(i => {
      const subtotal = i.price * i.qty
      return `
        <div class="row">
          <span class="item-name">${i.name}</span>
          <span class="item-right">฿${fmt(subtotal)}</span>
        </div>
        <div class="row item-detail">
          <span>${i.qty} × ฿${fmt(i.price)}</span>
        </div>`
    })
    .join('')

  const discountRow = discount > 0
    ? `<div class="row discount"><span>ส่วนลด</span><span>-฿${fmt(discount)}</span></div>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8">
<title>ใบเสร็จ ${billNo}</title>
<style>
  @page {
    margin: 0;
    size: ${paperWidth} auto;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Courier New', 'TH Sarabun New', monospace;
    font-size: ${paperWidth === '80mm' ? '13px' : '11px'};
    width: ${paperWidth === '80mm' ? '78mm' : '56mm'};
    padding: 3mm 2mm;
    color: #000;
  }
  .center { text-align: center; }
  .bold   { font-weight: bold; }
  .large  { font-size: ${paperWidth === '80mm' ? '15px' : '13px'}; }
  .small  { font-size: ${paperWidth === '80mm' ? '11px' : '9px'}; color: #333; }
  .hr     { border: none; border-top: 1px dashed #000; margin: 3mm 0; }
  .row    { display: flex; justify-content: space-between; margin-bottom: 1mm; }
  .item-name  { flex: 1; padding-right: 2mm; }
  .item-right { white-space: nowrap; }
  .item-detail { color: #555; margin-top: -1mm; margin-bottom: 2mm; }
  .discount   { color: #c00; }
  .total-row  { font-weight: bold; font-size: ${paperWidth === '80mm' ? '14px' : '12px'}; }
  .footer     { text-align: center; margin-top: 4mm; font-size: ${paperWidth === '80mm' ? '11px' : '9px'}; color: #555; }
</style>
</head>
<body>
  <div class="center bold large">${shopName}</div>
  <div class="center small">${shopAddress}</div>
  <hr class="hr">
  <div class="small">วันที่: ${date}</div>
  <div class="small">เลขที่: ${billNo}</div>
  <hr class="hr">
  ${itemRows}
  <hr class="hr">
  ${discountRow}
  <div class="row total-row">
    <span>ยอดสุทธิ</span>
    <span>฿${fmt(total)}</span>
  </div>
  <div class="row small">
    <span>รับเงิน</span>
    <span>฿${fmt(received)}</span>
  </div>
  <div class="row small">
    <span>เงินทอน</span>
    <span>฿${fmt(change)}</span>
  </div>
  <hr class="hr">
  <div class="footer">ขอบคุณที่ใช้บริการ</div>
</body>
</html>`

  const popup = window.open('', '_blank', `width=${paperWidth === '80mm' ? 320 : 240},height=600,scrollbars=yes`)
  if (!popup) {
    alert('กรุณาอนุญาต popup เพื่อพิมพ์ใบเสร็จ')
    return
  }
  popup.document.open()
  popup.document.write(html)
  popup.document.close()
  // Give images/fonts time to load before printing
  popup.onload = () => { popup.focus(); popup.print() }
  // Fallback if onload doesn't fire (already loaded)
  setTimeout(() => { try { popup.focus(); popup.print() } catch { /* ignore */ } }, 500)
}
