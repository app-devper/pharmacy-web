import { todayBangkok } from './date'

/**
 * สร้างล็อตหมายเลขอัตโนมัติ
 * รูปแบบ: PREFIX-YYMMDD-XXXX  เช่น LOT-260415-3421
 *
 * ใช้วันที่ตาม Asia/Bangkok เพื่อไม่ให้ล็อตช่วงเช้ามืด (00:01–07:00) โดนบันทึก
 * เป็นวันก่อนหน้า (ซึ่งจะเกิดขึ้นถ้าใช้ UTC จาก `toISOString()`).
 */
export function genLotNumber(prefix = 'LOT'): string {
  const ymd = todayBangkok().slice(2).replace(/-/g, '') // YYMMDD
  const suffix = String(Date.now()).slice(-4)
  return `${prefix}-${ymd}-${suffix}`
}
