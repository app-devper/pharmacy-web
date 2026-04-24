export interface BarcodeLabel {
  name: string
  barcode: string
  price?: number
  unit?: string
  lotNumber?: string
  expiryDate?: string
  copies: number
}

export interface PrintBarcodeLabelsOptions {
  labels: BarcodeLabel[]
  size: 'small' | 'medium'
  shopName?: string
}

const CODE128_PATTERNS = [
  '212222','222122','222221','121223','121322','131222','122213','122312','132212','221213',
  '221312','231212','112232','122132','122231','113222','123122','123221','223211','221132',
  '221231','213212','223112','312131','311222','321122','321221','312212','322112','322211',
  '212123','212321','232121','111323','131123','131321','112313','132113','132311','211313',
  '231113','231311','112133','112331','132131','113123','113321','133121','313121','211331',
  '231131','213113','213311','213131','311123','311321','331121','312113','312311','332111',
  '314111','221411','431111','111224','111422','121124','121421','141122','141221','112214',
  '112412','122114','122411','142112','142211','241211','221114','413111','241112','134111',
  '111242','121142','121241','114212','124112','124211','411212','421112','421211','212141',
  '214121','412121','111143','111341','131141','114113','114311','411113','411311','113141',
  '114131','311141','411131','211412','211214','211232','2331112',
]

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function code128Svg(value: string, width = 190, height = 54): string {
  const text = value.trim()
  const chars = Array.from(text).filter(ch => {
    const code = ch.charCodeAt(0)
    return code >= 32 && code <= 126
  })
  const codes = [104, ...chars.map(ch => ch.charCodeAt(0) - 32)]
  let checksum = 104
  for (let i = 1; i < codes.length; i++) checksum += codes[i] * i
  codes.push(checksum % 103, 106)

  const modules = codes.flatMap(code => CODE128_PATTERNS[code].split('').map(Number))
  const total = modules.reduce((sum, n) => sum + n, 0)
  const scale = width / total
  let x = 0
  let bars = ''
  modules.forEach((moduleWidth, index) => {
    const w = moduleWidth * scale
    if (index % 2 === 0) {
      bars += `<rect x="${x.toFixed(2)}" y="0" width="${Math.max(0.7, w).toFixed(2)}" height="${height}" fill="#000"/>`
    }
    x += w
  })
  return `<svg class="barcode" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-label="${esc(text)}">${bars}</svg>`
}

function labelHtml(label: BarcodeLabel, shopName: string): string {
  const price = label.price != null ? `<div class="price">฿${label.price.toLocaleString('th-TH')}</div>` : ''
  const unit = label.unit ? ` / ${esc(label.unit)}` : ''
  const lot = label.lotNumber ? `<span>Lot ${esc(label.lotNumber)}</span>` : ''
  const exp = label.expiryDate ? `<span>Exp ${new Date(label.expiryDate).toLocaleDateString('th-TH')}</span>` : ''
  return `
    <section class="label">
      <div class="shop">${esc(shopName)}</div>
      <div class="name">${esc(label.name)}</div>
      <div class="meta">${lot}${exp}</div>
      ${code128Svg(label.barcode)}
      <div class="code">${esc(label.barcode)}</div>
      <div class="bottom">${price}<div class="unit">${unit}</div></div>
    </section>`
}

export function printBarcodeLabels(opts: PrintBarcodeLabelsOptions) {
  const shopName = opts.shopName || 'ร้านยา'
  const expanded = opts.labels.flatMap(label => Array.from({ length: label.copies }, () => label))
  if (expanded.length === 0) return

  const dims = opts.size === 'small'
    ? { w: '38mm', h: '25mm', cols: '38mm' }
    : { w: '50mm', h: '30mm', cols: '50mm' }

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8">
<title>พิมพ์ฉลากบาร์โค้ด</title>
<style>
  @page { margin: 4mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: Arial, 'Tahoma', sans-serif;
    color: #000;
  }
  .sheet {
    display: grid;
    grid-template-columns: repeat(auto-fill, ${dims.cols});
    gap: 2mm;
    align-items: start;
  }
  .label {
    width: ${dims.w};
    height: ${dims.h};
    border: 1px dashed #bbb;
    padding: 1.6mm;
    overflow: hidden;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .shop { font-size: 7px; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .name { font-size: 9px; font-weight: 700; line-height: 1.1; height: 20px; overflow: hidden; }
  .meta { display: flex; gap: 3px; font-size: 6.5px; color: #333; min-height: 8px; white-space: nowrap; }
  .barcode { width: 100%; height: ${opts.size === 'small' ? '9mm' : '11mm'}; display: block; margin-top: 1mm; }
  .code { font-size: 7px; text-align: center; letter-spacing: 0; line-height: 1; }
  .bottom { display: flex; align-items: baseline; justify-content: space-between; gap: 2px; margin-top: 1mm; }
  .price { font-size: 10px; font-weight: 700; }
  .unit { font-size: 7px; color: #333; white-space: nowrap; }
  @media print {
    .label { border-color: transparent; }
  }
</style>
</head>
<body><main class="sheet">${expanded.map(label => labelHtml(label, shopName)).join('')}</main></body>
</html>`

  const popup = window.open('', '_blank', 'width=900,height=700,scrollbars=yes')
  if (!popup) {
    alert('กรุณาอนุญาต popup เพื่อพิมพ์ฉลาก')
    return
  }
  popup.document.open()
  popup.document.write(html)
  popup.document.close()
  popup.onload = () => { popup.focus(); popup.print() }
  setTimeout(() => { try { popup.focus(); popup.print() } catch { /* ignore */ } }, 500)
}
