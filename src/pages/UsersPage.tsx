import { useState, useEffect, useCallback } from 'react'
import type { UmUser, CreateUserInput, UpdateUserInput } from '../types/umUser'
import {
  listUsers, createUser, updateUser, deleteUser,
  setUserRole, setUserStatus, setUserPassword,
} from '../api/umUsers'
import { useToast } from '../hooks/useToast'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'

const ROLES_SUPER = ['SUPER', 'ADMIN', 'USER']
const ROLES_ADMIN = ['ADMIN', 'USER']
const CLIENT_ID = 'PHA'

// ─── Badges ───────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const cls: Record<string, string> = {
    SUPER: 'bg-purple-100 text-purple-700',
    ADMIN: 'bg-blue-100   text-blue-700',
    USER:  'bg-gray-100   text-gray-700',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${cls[role] ?? 'bg-gray-100 text-gray-700'}`}>
      {role}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const active = status === 'ACTIVE'
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
      {active ? 'ใช้งาน' : 'ระงับ'}
    </span>
  )
}

// ─── Add / Edit user modal ────────────────────────────────────────────────────

interface UserFormProps {
  target?: UmUser
  onClose: () => void
  onSaved: () => void
}

function UserFormModal({ target, onClose, onSaved }: UserFormProps) {
  const showToast = useToast()
  const isEdit = !!target
  const [form, setForm] = useState({
    firstName: target?.firstName ?? '',
    lastName:  target?.lastName  ?? '',
    username:  target?.username  ?? '',
    password:  '',
    phone:     target?.phone     ?? '',
    email:     target?.email     ?? '',
  })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.firstName || !form.lastName || !form.username) {
      showToast('กรุณากรอกข้อมูลที่จำเป็น', 'error'); return
    }
    if (!isEdit && form.password.length < 8) {
      showToast('รหัสผ่านต้องไม่น้อยกว่า 8 ตัวอักษร', 'error'); return
    }
    setLoading(true)
    try {
      if (isEdit) {
        const payload: UpdateUserInput = {
          firstName: form.firstName,
          lastName:  form.lastName,
          phone:     form.phone,
          email:     form.email,
        }
        await updateUser(target!.id, payload)
      } else {
        const payload: CreateUserInput = {
          firstName: form.firstName,
          lastName:  form.lastName,
          username:  form.username,
          password:  form.password,
          phone:     form.phone,
          email:     form.email,
          clientId:  CLIENT_ID,
        }
        await createUser(payload)
      }
      showToast(isEdit ? 'แก้ไขผู้ใช้งานสำเร็จ' : 'เพิ่มผู้ใช้งานสำเร็จ')
      onSaved()
    } catch (e: unknown) {
      showToast((e as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const fields: { label: string; key: keyof typeof form; type?: string; disabled?: boolean }[] = [
    { label: 'ชื่อ *',         key: 'firstName' },
    { label: 'นามสกุล *',      key: 'lastName'  },
    { label: 'ชื่อผู้ใช้ *',   key: 'username',  disabled: isEdit },
    { label: 'รหัสผ่าน' + (!isEdit ? ' * (≥8 ตัว)' : ''), key: 'password', type: 'password', disabled: isEdit },
    { label: 'เบอร์โทร',       key: 'phone',     type: 'tel'  },
    { label: 'อีเมล',          key: 'email',     type: 'email' },
  ]

  return (
    <Modal title={isEdit ? 'แก้ไขผู้ใช้งาน' : 'เพิ่มผู้ใช้งาน'} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
              <input
                type={f.type ?? 'text'}
                value={form[f.key]}
                onChange={e => set(f.key, e.target.value)}
                disabled={f.disabled}
                placeholder={f.disabled ? '(ไม่สามารถแก้ไขได้)' : ''}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" className="flex-1" onClick={onClose}>ยกเลิก</Button>
          <Button className="flex-1" onClick={handleSave} disabled={loading}>
            {loading ? 'กำลังบันทึก…' : 'บันทึก'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Set password modal ───────────────────────────────────────────────────────

function SetPasswordModal({ user, onClose, onSaved }: { user: UmUser; onClose: () => void; onSaved: () => void }) {
  const showToast = useToast()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSave = async () => {
    if (password.length < 8) { showToast('รหัสผ่านต้องไม่น้อยกว่า 8 ตัวอักษร', 'error'); return }
    if (password !== confirm)  { showToast('รหัสผ่านไม่ตรงกัน', 'error'); return }
    setLoading(true)
    try {
      await setUserPassword(user.id, password)
      showToast('เปลี่ยนรหัสผ่านสำเร็จ')
      onSaved()
    } catch (e: unknown) {
      showToast((e as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={`ตั้งรหัสผ่าน — ${user.firstName} ${user.lastName}`} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">รหัสผ่านใหม่ * (≥8 ตัว)</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">ยืนยันรหัสผ่าน *</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
        </div>
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" className="flex-1" onClick={onClose}>ยกเลิก</Button>
          <Button className="flex-1" onClick={handleSave} disabled={loading}>
            {loading ? 'กำลังบันทึก…' : 'ตั้งรหัสผ่าน'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── User detail modal ────────────────────────────────────────────────────────

function UserDetailModal({ user, onClose }: { user: UmUser; onClose: () => void }) {
  const rows: { label: string; value: string }[] = [
    { label: 'ชื่อ-นามสกุล', value: `${user.firstName} ${user.lastName}` },
    { label: 'Username',      value: user.username },
    { label: 'Role',          value: user.role },
    { label: 'สถานะ',         value: user.status === 'ACTIVE' ? 'ใช้งาน' : 'ระงับ' },
    { label: 'เบอร์โทร',      value: user.phone  || '—' },
    { label: 'อีเมล',         value: user.email  || '—' },
    { label: 'Client ID',     value: user.clientId || '—' },
  ]
  return (
    <Modal title="ข้อมูลผู้ใช้งาน" onClose={onClose}>
      <div className="space-y-3">
        <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg shrink-0">
            {user.firstName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-gray-800">{user.firstName} {user.lastName}</div>
            <div className="text-xs text-gray-400">@{user.username}</div>
          </div>
          <div className="ml-auto flex gap-1.5">
            <RoleBadge role={user.role} />
            <StatusBadge status={user.status} />
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          {rows.slice(4).map(r => (
            <div key={r.label}>
              <dt className="text-xs text-gray-400">{r.label}</dt>
              <dd className="text-sm text-gray-700 mt-0.5">{r.value}</dd>
            </div>
          ))}
        </dl>
        <div className="pt-2 flex justify-end">
          <Button variant="secondary" onClick={onClose}>ปิด</Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const showToast = useToast()
  const { user: me } = useAuth()
  const isSuperAdmin = me?.role === 'SUPER'

  // Mirror ValidateUserRole from API:
  // SUPER can manage ADMIN + USER; ADMIN can manage USER only
  const canManage = (target: UmUser) => {
    if (!me || me.id === target.id) return false
    if (me.role === 'SUPER') return target.role !== 'SUPER'
    if (me.role === 'ADMIN') return target.role === 'USER'
    return false
  }

  const [users, setUsers]               = useState<UmUser[]>([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [showAdd, setShowAdd]           = useState(false)
  const [editTarget, setEditTarget]     = useState<UmUser | null>(null)
  const [pwdTarget, setPwdTarget]       = useState<UmUser | null>(null)
  const [detailTarget, setDetailTarget] = useState<UmUser | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setUsers(await listUsers()) }
    catch (e: unknown) { showToast((e as Error).message, 'error') }
    finally { setLoading(false) }
  }, [showToast])

  useEffect(() => { load() }, [load])

  const handleToggleStatus = async (u: UmUser) => {
    const next = u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    try {
      await setUserStatus(u.id, next)
      showToast(`${next === 'ACTIVE' ? 'เปิดใช้งาน' : 'ระงับ'}ผู้ใช้ ${u.username} สำเร็จ`)
      load()
    } catch (e: unknown) {
      showToast((e as Error).message, 'error')
    }
  }

  const handleChangeRole = async (u: UmUser, role: string) => {
    try {
      await setUserRole(u.id, role)
      showToast(`เปลี่ยน Role ของ ${u.username} เป็น ${role} สำเร็จ`)
      load()
    } catch (e: unknown) {
      showToast((e as Error).message, 'error')
    }
  }

  const handleDelete = async (u: UmUser) => {
    if (!window.confirm(`ยืนยันลบผู้ใช้งาน "${u.username}" ?\nการดำเนินการนี้ไม่สามารถกู้คืนได้`)) return
    try {
      await deleteUser(u.id)
      showToast(`ลบผู้ใช้ ${u.username} สำเร็จ`)
      load()
    } catch (e: unknown) {
      showToast((e as Error).message, 'error')
    }
  }

  const q = search.toLowerCase()
  const filtered = users.filter(u =>
    u.firstName.toLowerCase().includes(q) ||
    u.lastName.toLowerCase().includes(q) ||
    u.username.toLowerCase().includes(q) ||
    u.email.toLowerCase().includes(q)
  )

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-800">จัดการผู้ใช้งาน</h1>
          <p className="text-xs text-gray-400 mt-0.5">บัญชีผู้ใช้ในระบบ User Management</p>
        </div>
        <div className="flex-1" />
        <input
          type="text"
          placeholder="ค้นหาชื่อ / username / อีเมล…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm w-60 focus:outline-none focus:border-blue-400"
        />
        <Button onClick={() => setShowAdd(true)}>+ เพิ่มผู้ใช้งาน</Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-24"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-2">
            <span className="text-4xl">�</span>
            <span className="text-sm">{search ? 'ไม่พบผู้ใช้งานที่ค้นหา' : 'ยังไม่มีผู้ใช้งาน'}</span>
            {!search && (
              <button
                onClick={() => setShowAdd(true)}
                className="mt-2 text-sm text-blue-600 hover:underline"
              >+ เพิ่มผู้ใช้งานคนแรก</button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">ชื่อ-นามสกุล</th>
                  <th className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">Username</th>
                  <th className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">เบอร์โทร / อีเมล</th>
                  <th className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">Role</th>
                  <th className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">สถานะ</th>
                  <th className="py-3 px-4 text-xs text-gray-500 font-semibold w-52">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const isMe = u.id === me?.id
                  return (
                    <tr
                      key={u.id}
                      className="border-t border-gray-50 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setDetailTarget(u)}
                    >
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-800">{u.firstName} {u.lastName}</div>
                        {isMe && <div className="text-xs text-blue-500 mt-0.5">บัญชีของคุณ</div>}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-gray-600">{u.username}</td>
                      <td className="py-3 px-4">
                        <div className="text-gray-600">{u.phone || <span className="text-gray-300">—</span>}</div>
                        <div className="text-xs text-gray-400">{u.email || <span className="text-gray-300">—</span>}</div>
                      </td>
                      <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                        {canManage(u) ? (
                          <select
                            value={u.role}
                            onChange={e => handleChangeRole(u, e.target.value)}
                            className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-400"
                          >
                            {(isSuperAdmin ? ROLES_SUPER : ROLES_ADMIN).map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        ) : (
                          <RoleBadge role={u.role} />
                        )}
                      </td>
                      <td className="py-3 px-4"><StatusBadge status={u.status} /></td>
                      <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => setEditTarget(u)}
                            className="px-2.5 py-1 text-xs rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                          >แก้ไข</button>
                          {canManage(u) && (
                            <button
                              onClick={() => setPwdTarget(u)}
                              className="px-2.5 py-1 text-xs rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                            >รหัสผ่าน</button>
                          )}
                          {canManage(u) && (
                            <button
                              onClick={() => handleToggleStatus(u)}
                              className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                                u.status === 'ACTIVE'
                                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-600'
                                  : 'bg-green-50 hover:bg-green-100 text-green-600'
                              }`}
                            >{u.status === 'ACTIVE' ? 'ระงับ' : 'เปิดใช้'}</button>
                          )}
                          {canManage(u) && (
                            <button
                              onClick={() => handleDelete(u)}
                              className="px-2.5 py-1 text-xs rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                            >ลบ</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAdd && (
        <UserFormModal
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); load() }}
        />
      )}
      {editTarget && (
        <UserFormModal
          target={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); load() }}
        />
      )}
      {pwdTarget && (
        <SetPasswordModal
          user={pwdTarget}
          onClose={() => setPwdTarget(null)}
          onSaved={() => { setPwdTarget(null) }}
        />
      )}
      {detailTarget && (
        <UserDetailModal
          user={detailTarget}
          onClose={() => setDetailTarget(null)}
        />
      )}
    </div>
  )
}
