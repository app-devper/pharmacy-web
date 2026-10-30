import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { launchFailureMessage } from '../lib/launch'

/** Signs in with the one-time ticket UM put in the address (um-api ADR-0011). */
export default function SsoPage() {
  const { continueFromUm } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const ticket = new URLSearchParams(window.location.search).get('ticket')
    window.history.replaceState(null, '', '/sso')
    if (!ticket) {
      navigate('/login', { replace: true })
      return
    }
    continueFromUm(ticket, 'PHARMACY')
      .then(() => navigate('/', { replace: true }))
      .catch((err: unknown) => setError(launchFailureMessage(err)))
  }, [continueFromUm, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow p-6 text-center space-y-4">
        {error ? (
          <>
            <p role="alert" className="text-sm text-red-700">{error}</p>
            <Link to="/login" replace className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-white text-sm font-medium">
              ไปหน้าเข้าสู่ระบบ
            </Link>
          </>
        ) : (
          <p role="status" className="text-sm text-gray-600">กำลังเปิดร้านยาจาก UM…</p>
        )}
      </div>
    </div>
  )
}
