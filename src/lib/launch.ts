import { ApiError } from '../api/errors'

/** Thai reason why opening the shop from UM did not sign the user in. */
export function launchFailureMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return 'ลิงก์จาก UM หมดอายุหรือถูกใช้ไปแล้ว เปิดจาก UM อีกครั้งหรือเข้าสู่ระบบด้วยตัวเอง'
    if (err.status === 429) return 'ลองหลายครั้งเกินไป กรุณารอสักครู่'
  }
  if (err instanceof TypeError) return 'เชื่อมต่อระบบไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่'
  return 'บัญชีนี้เปิดระบบร้านยาจาก UM ไม่ได้ กรุณาเข้าสู่ระบบด้วยตัวเอง'
}
