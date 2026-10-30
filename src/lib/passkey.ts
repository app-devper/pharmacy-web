import { ApiError } from '../api/errors'
import type { PasskeyCeremony, PasskeyRequest } from './session'

type JsonCredentialStatics = {
  parseRequestOptionsFromJSON?: (o: unknown) => PublicKeyCredentialRequestOptions
  isConditionalMediationAvailable?: () => Promise<boolean>
}

function statics(): JsonCredentialStatics | null {
  if (typeof window === 'undefined' || typeof window.PublicKeyCredential !== 'function') return null
  return window.PublicKeyCredential as unknown as JsonCredentialStatics
}

/** Whether this browser can answer UM's passkey login options. */
export function passkeysSupported(): boolean {
  return typeof statics()?.parseRequestOptionsFromJSON === 'function'
}

/** Whether this browser can offer passkeys in the username field (WebAuthn conditional mediation). */
export async function passkeyAutofillSupported(): Promise<boolean> {
  const s = statics()
  if (!s?.parseRequestOptionsFromJSON || typeof s.isConditionalMediationAvailable !== 'function') return false
  try {
    return await s.isConditionalMediationAvailable()
  } catch {
    return false
  }
}

/** The browser authenticator: navigator.credentials.get from UM's JSON options. */
export const browserPasskeys: PasskeyCeremony = {
  async get(options: unknown, request: PasskeyRequest = {}) {
    const parse = statics()?.parseRequestOptionsFromJSON
    if (!parse) throw new DOMException('passkeys unsupported', 'NotSupportedError')
    const publicKey = parse((options as { options: { publicKey: unknown } }).options.publicKey)
    const mediation = request.conditional ? 'conditional' : undefined
    const credential = await navigator.credentials.get({ publicKey, mediation, signal: request.signal })
    if (!credential) throw new DOMException('no credential', 'NotAllowedError')
    return (credential as PublicKeyCredential & { toJSON: () => unknown }).toJSON()
  },
}

/** Thai text for a failed passkey login. */
export function passkeyLoginMessage(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError' || err.name === 'AbortError') return 'ยกเลิกการใช้ passkey แล้ว'
    if (err.name === 'NotSupportedError') return 'เบราว์เซอร์นี้ใช้ passkey ไม่ได้'
  }
  if (err instanceof ApiError) {
    if (err.body.includes('UM-401-005')) return 'passkey นี้ใช้กับระบบนี้ไม่ได้ ลองเลือก passkey อื่นหรือเข้าสู่ระบบด้วยรหัสผ่าน'
    if (err.body.includes('UM-401-006')) return 'passkey ที่เลือกเป็นของบัญชีอื่น ไม่ตรงกับชื่อผู้ใช้ที่กรอก เลือก passkey ของบัญชีนี้หรือล้างช่องชื่อผู้ใช้'
    if (err.body.includes('UM-400-006')) return 'คำขอ passkey หมดเวลา ลองใหม่อีกครั้ง'
    if (err.body.includes('UM-404-002')) return 'ระบบยังไม่เปิดใช้ passkey'
    if (err.status === 401) return 'บัญชีนี้ใช้ระบบร้านยาไม่ได้'
    if (err.status === 429) return 'ลองหลายครั้งเกินไป กรุณารอสักครู่'
  }
  return 'เข้าสู่ระบบด้วย passkey ไม่สำเร็จ'
}
