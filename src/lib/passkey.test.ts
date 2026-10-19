import { describe, expect, it } from 'vitest'
import { ApiError } from '../api/errors'
import { passkeyLoginMessage } from './passkey'

describe('passkeyLoginMessage', () => {
  it('names what went wrong in Thai', () => {
    expect(passkeyLoginMessage(new DOMException('x', 'NotAllowedError'))).toBe('ยกเลิกการใช้ passkey แล้ว')
    expect(passkeyLoginMessage(new ApiError('passkey not accepted', 401, '{"code":"UM-401-005"}'))).toContain('passkey นี้ใช้กับระบบนี้ไม่ได้')
    expect(passkeyLoginMessage(new ApiError('expired', 400, '{"code":"UM-400-006"}'))).toBe('คำขอ passkey หมดเวลา ลองใหม่อีกครั้ง')
    expect(passkeyLoginMessage(new ApiError('wrong system', 401, '{"code":"UM-401-004"}'))).toBe('บัญชีนี้ใช้ระบบร้านยาไม่ได้')
    expect(passkeyLoginMessage(new Error('boom'))).toBe('เข้าสู่ระบบด้วย passkey ไม่สำเร็จ')
  })
})
