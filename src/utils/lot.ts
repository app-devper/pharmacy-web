/**
 * สร้างล็อตหมายเลขอัตโนมัติ
 * รูปแบบ: PREFIX-YYMMDD-XXXX  เช่น LOT-260415-3421
 */
export function genLotNumber(prefix = 'LOT'): string {
  const ymd = new Date().toISOString().slice(2, 10).replace(/-/g, '') // YYMMDD
  const suffix = String(Date.now()).slice(-4)
  return `${prefix}-${ymd}-${suffix}`
}
