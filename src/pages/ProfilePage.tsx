import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { updateMyInfo, changeMyPassword } from '../api/umUsers'
import { useToast } from '../hooks/useToast'
import { usePreferences, type Theme, type FontSize } from '../hooks/usePreferences'
import Button from '../components/ui/Button'

// ─── Section card wrapper ─────────────────────────────────────────────────────

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-800">{title}</h2>
        <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

// ─── Edit profile info ────────────────────────────────────────────────────────

function EditInfoSection() {
  const { user, refreshUser } = useAuth()
  const showToast = useToast()

  const [form, setForm] = useState({
    firstName: user?.firstName ?? '',
    lastName:  user?.lastName  ?? '',
    phone:     user?.phone     ?? '',
    email:     user?.email     ?? '',
  })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      showToast('กรุณากรอกชื่อและนามสกุล', 'error')
      return
    }
    setLoading(true)
    try {
      await updateMyInfo({
        firstName: form.firstName.trim(),
        lastName:  form.lastName.trim(),
        phone:     form.phone.trim(),
        email:     form.email.trim(),
      })
      await refreshUser()
      showToast('บันทึกข้อมูลสำเร็จ')
    } catch (e: unknown) {
      showToast((e as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const fields: { label: string; key: keyof typeof form; type?: string }[] = [
    { label: 'ชื่อ *',   key: 'firstName' },
    { label: 'นามสกุล *', key: 'lastName'  },
    { label: 'เบอร์โทร',  key: 'phone',     type: 'tel'   },
    { label: 'อีเมล',    key: 'email',     type: 'email' },
  ]

  return (
    <Section title="ข้อมูลส่วนตัว" subtitle="แก้ไขชื่อ, เบอร์โทร และอีเมลของบัญชีคุณ">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        {fields.map(f => (
          <div key={f.key}>
            <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
            <input
              type={f.type ?? 'text'}
              value={form[f.key]}
              onChange={e => set(f.key, e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
        ))}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Username</label>
          <input
            type="text"
            value={user?.username ?? ''}
            disabled
            className="w-full border border-gray-100 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
          <input
            type="text"
            value={user?.role ?? ''}
            disabled
            className="w-full border border-gray-100 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? 'กำลังบันทึก…' : 'บันทึกข้อมูล'}
        </Button>
      </div>
    </Section>
  )
}

// ─── Change password ──────────────────────────────────────────────────────────

function ChangePasswordSection() {
  const showToast = useToast()
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.oldPassword) {
      showToast('กรุณากรอกรหัสผ่านปัจจุบัน', 'error'); return
    }
    if (form.newPassword.length < 8) {
      showToast('รหัสผ่านใหม่ต้องไม่น้อยกว่า 8 ตัวอักษร', 'error'); return
    }
    if (form.newPassword !== form.confirmPassword) {
      showToast('รหัสผ่านใหม่ไม่ตรงกัน', 'error'); return
    }
    if (form.oldPassword === form.newPassword) {
      showToast('รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม', 'error'); return
    }
    setLoading(true)
    try {
      await changeMyPassword(form.oldPassword, form.newPassword)
      showToast('เปลี่ยนรหัสผ่านสำเร็จ')
      setForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
    } catch (e: unknown) {
      showToast((e as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const fields: { label: string; key: keyof typeof form }[] = [
    { label: 'รหัสผ่านปัจจุบัน *', key: 'oldPassword'     },
    { label: 'รหัสผ่านใหม่ * (≥8 ตัว)', key: 'newPassword' },
    { label: 'ยืนยันรหัสผ่านใหม่ *',    key: 'confirmPassword' },
  ]

  return (
    <Section title="เปลี่ยนรหัสผ่าน" subtitle="ต้องใส่รหัสผ่านปัจจุบันก่อนตั้งรหัสผ่านใหม่">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        {fields.map(f => (
          <div key={f.key} className={f.key === 'oldPassword' ? 'sm:col-span-2' : ''}>
            <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
            <input
              type="password"
              value={form[f.key]}
              onChange={e => set(f.key, e.target.value)}
              autoComplete={f.key === 'oldPassword' ? 'current-password' : 'new-password'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? 'กำลังบันทึก…' : 'เปลี่ยนรหัสผ่าน'}
        </Button>
      </div>
    </Section>
  )
}

// ─── Preferences (per-browser, localStorage) ─────────────────────────────────

function PreferencesSection() {
  const { prefs, setTheme, setFontSize } = usePreferences()

  const themes: { id: Theme; label: string; icon: string; desc: string }[] = [
    { id: 'light', label: 'สว่าง',   icon: '☀️', desc: 'พื้นสีขาว'                },
    { id: 'dark',  label: 'มืด',      icon: '🌙', desc: 'ลดแสงจ้า ถนอมสายตา'       },
    { id: 'auto',  label: 'อัตโนมัติ', icon: '🖥️', desc: 'ตามค่าเครื่อง / ระบบ'    },
  ]

  const fonts: { id: FontSize; label: string; sample: string }[] = [
    { id: 'small',  label: 'เล็ก',    sample: 'ก'  },
    { id: 'normal', label: 'ปกติ',    sample: 'ก'  },
    { id: 'large',  label: 'ใหญ่',    sample: 'ก'  },
    { id: 'xl',     label: 'ใหญ่มาก', sample: 'ก'  },
  ]
  const fontPxSample: Record<FontSize, string> = {
    small: '14px', normal: '16px', large: '18px', xl: '20px',
  }

  return (
    <Section title="การแสดงผล" subtitle="ปรับธีมและขนาดตัวอักษร (บันทึกเฉพาะอุปกรณ์นี้)">
      {/* Theme */}
      <div className="mb-5">
        <label className="block text-xs font-medium text-gray-600 mb-2">ธีม</label>
        <div className="grid grid-cols-3 gap-2">
          {themes.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              className={`px-3 py-3 rounded-lg border text-left transition-colors ${
                prefs.theme === t.id
                  ? 'border-blue-400 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span aria-hidden="true">{t.icon}</span>
                <span className="text-sm font-medium">{t.label}</span>
              </div>
              <div className="text-xs text-gray-400">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Font size */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">
          ขนาดตัวอักษร <span className="text-gray-400 font-normal">(มีผลทั้งแอป)</span>
        </label>
        <div className="grid grid-cols-4 gap-2">
          {fonts.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFontSize(f.id)}
              className={`px-3 py-3 rounded-lg border transition-colors ${
                prefs.fontSize === f.id
                  ? 'border-blue-400 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              <div className="font-bold leading-none mb-1" style={{ fontSize: fontPxSample[f.id] }}>
                {f.sample}
              </div>
              <div className="text-xs">{f.label}</div>
            </button>
          ))}
        </div>
      </div>
    </Section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user } = useAuth()

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
            {user?.firstName?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">{user?.firstName} {user?.lastName}</h1>
            <p className="text-sm text-gray-400">@{user?.username}</p>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <EditInfoSection />
        <PreferencesSection />
        <ChangePasswordSection />
      </div>
    </div>
  )
}
