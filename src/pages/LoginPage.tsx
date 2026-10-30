import { useCallback, useEffect, useRef, useState } from 'react'
import { passkeyLoginMessage, passkeysSupported } from '../lib/passkey'
import { usePasskeyAutofill, type AutofillRequest } from '../lib/usePasskeyAutofill'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login, loginWithPasskey, user } = useAuth()
  const [passkeyAvailable] = useState(passkeysSupported)
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  // The passkey may answer long after its request started; send the username as typed then.
  const typedUsername = useRef('')
  useEffect(() => {
    typedUsername.current = username
  }, [username])

  const autofillLogin = useCallback(async (request: AutofillRequest) => {
    await loginWithPasskey('PHARMACY', { ...request, typedUsername: () => typedUsername.current })
    navigate('/', { replace: true })
  }, [loginWithPasskey, navigate])
  const showPasskeyError = useCallback((err: unknown) => setError(passkeyLoginMessage(err)), [])
  const autofill = usePasskeyAutofill(passkeyAvailable, autofillLogin, showPasskeyError)

  if (user) return <Navigate to="/" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password, 'PHARMACY')
      navigate('/', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  const handlePasskey = async () => {
    autofill.pause() // a browser runs one passkey request at a time
    setError('')
    setLoading(true)
    try {
      await loginWithPasskey('PHARMACY', { typedUsername: () => typedUsername.current })
      navigate('/', { replace: true })
    } catch (err: unknown) {
      setError(passkeyLoginMessage(err))
      autofill.resume()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">💊</span>
            </div>
            <h1 className="text-xl font-bold text-gray-800">ร้านยา เฮลท์ตี้ฟาร์ม</h1>
            <p className="text-sm text-gray-500 mt-1">ระบบ POS ร้านขายยา</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อผู้ใช้</label>
              <input
                type="text"
                name="username"
                autoComplete="username webauthn"
                spellCheck={false}
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                placeholder="เช่น admin01"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
            </button>
          </form>
          {passkeyAvailable && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="h-px flex-1 bg-gray-200" />
                หรือ
                <span className="h-px flex-1 bg-gray-200" />
              </div>
              <button
                type="button"
                onClick={handlePasskey}
                disabled={loading}
                className="w-full py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-800 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                เข้าสู่ระบบด้วย passkey
              </button>
              <p className="text-xs text-center text-gray-500">
                เพิ่ม passkey ได้ที่หน้าโปรไฟล์ของระบบจัดการผู้ใช้ (um.devper.app)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
