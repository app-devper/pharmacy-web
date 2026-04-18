import { useState, useEffect } from 'react'
import { useSettings } from '../context/SettingsContext'
import { updateSettings } from '../api/settings'
import { useToast } from '../hooks/useToast'
import { useIsAdmin } from '../hooks/useIsAdmin'
import { useDrugs } from '../hooks/useDrugs'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import ImportJsonModal from '../components/stock/ImportJsonModal'
import type { Settings } from '../types/setting'
import { defaultSettings } from '../types/setting'

type Tab = 'store' | 'receipt' | 'stock' | 'pharmacist' | 'ky' | 'import'

export default function SettingsPage() {
  const isAdmin = useIsAdmin()
  const { settings, loading, setSettings } = useSettings()
  const { reload: reloadDrugs } = useDrugs()
  const showToast = useToast()

  const [tab, setTab] = useState<Tab>('store')
  const [form, setForm] = useState<Settings>(settings)
  const [saving, setSaving] = useState(false)
  const [loadedOnce, setLoadedOnce] = useState(false)
  const [showImportJson, setShowImportJson] = useState(false)

  // Seed the form from context only once (when settings arrive the first time).
  // Afterwards the local form is authoritative until the user clicks Save, so
  // background context updates don't silently wipe unsaved edits.
  useEffect(() => {
    if (loadedOnce) return
    if (settings.updated_at || settings.store.name !== defaultSettings.store.name) {
      setForm(settings)
      setLoadedOnce(true)
    }
  }, [settings, loadedOnce])

  if (loading && !form.store.name) return <Spinner />

  const setStore = (k: keyof Settings['store'], v: string) =>
    setForm(f => ({ ...f, store: { ...f.store, [k]: v } }))

  const setReceipt = <K extends keyof Settings['receipt']>(k: K, v: Settings['receipt'][K]) =>
    setForm(f => ({ ...f, receipt: { ...f.receipt, [k]: v } }))

  const setStock = <K extends keyof Settings['stock']>(k: K, v: Settings['stock'][K]) =>
    setForm(f => ({ ...f, stock: { ...f.stock, [k]: v } }))

  const setPharmacist = <K extends keyof Settings['pharmacist']>(k: K, v: Settings['pharmacist'][K]) =>
    setForm(f => ({ ...f, pharmacist: { ...f.pharmacist, [k]: v } }))

  const setKy = <K extends keyof Settings['ky']>(k: K, v: Settings['ky'][K]) =>
    setForm(f => ({ ...f, ky: { ...f.ky, [k]: v } }))

  const handleSave = async () => {
    if (!form.store.name.trim()) {
      showToast('กรุณาระบุชื่อร้าน', 'error')
      return
    }
    if (form.stock.low_stock_threshold < 0) {
      showToast('threshold ต้องไม่ติดลบ', 'error')
      return
    }
    setSaving(true)
    try {
      const saved = await updateSettings({
        store:      form.store,
        receipt:    form.receipt,
        stock:      form.stock,
        pharmacist: form.pharmacist,
        ky:         form.ky,
      })
      setSettings(saved)
      showToast('บันทึกการตั้งค่าเรียบร้อย', 'success')
    } catch (e: unknown) {
      showToast((e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const labelCls = 'block text-xs font-medium text-gray-600 mb-1'
  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400'

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'store',      label: 'ข้อมูลร้าน', icon: '🏪' },
    { id: 'receipt',    label: 'ใบเสร็จ',     icon: '🧾' },
    { id: 'stock',      label: 'สต็อก',       icon: '📦' },
    { id: 'pharmacist', label: 'เภสัชกร',     icon: '👨‍⚕️' },
    { id: 'ky',         label: 'ขย.',          icon: '📋' },
    { id: 'import',     label: 'นำเข้าข้อมูล', icon: '📥' },
  ]

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-xl font-semibold text-gray-800 mb-4">ตั้งค่า</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-5">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="mr-1.5" aria-hidden="true">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        {/* ───── Store tab ───── */}
        {tab === 'store' && (
          <>
            <div>
              <label className={labelCls}>ชื่อร้าน *</label>
              <input
                type="text"
                value={form.store.name}
                onChange={e => setStore('name', e.target.value)}
                disabled={!isAdmin}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>ที่อยู่</label>
              <textarea
                value={form.store.address}
                onChange={e => setStore('address', e.target.value)}
                disabled={!isAdmin}
                rows={2}
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>เบอร์โทร</label>
                <input
                  type="tel"
                  value={form.store.phone}
                  onChange={e => setStore('phone', e.target.value)}
                  disabled={!isAdmin}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>เลขประจำตัวผู้เสียภาษี</label>
                <input
                  type="text"
                  value={form.store.tax_id}
                  onChange={e => setStore('tax_id', e.target.value)}
                  disabled={!isAdmin}
                  className={inputCls}
                />
              </div>
            </div>
            <p className="text-xs text-gray-400">
              ข้อมูลร้านจะแสดงที่หัวใบเสร็จและเอกสารที่ export ออกไป
            </p>
          </>
        )}

        {/* ───── Receipt tab ───── */}
        {tab === 'receipt' && (
          <>
            <div>
              <label className={labelCls}>ข้อความหัว (tagline ก่อนรายการ)</label>
              <input
                type="text"
                value={form.receipt.header}
                onChange={e => setReceipt('header', e.target.value)}
                disabled={!isAdmin}
                placeholder="เช่น ยินดีต้อนรับ"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>ข้อความท้าย</label>
              <input
                type="text"
                value={form.receipt.footer}
                onChange={e => setReceipt('footer', e.target.value)}
                disabled={!isAdmin}
                placeholder="เช่น ขอบคุณที่ใช้บริการ"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>ขนาดกระดาษ</label>
              <div className="flex gap-2">
                {(['58', '80'] as const).map(w => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setReceipt('paper_width', w)}
                    disabled={!isAdmin}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-colors ${
                      form.receipt.paper_width === w
                        ? 'border-blue-400 bg-blue-50 text-blue-700 font-medium'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    {w}mm
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-2 border-t border-gray-100">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.receipt.show_pharmacist}
                  onChange={e => setReceipt('show_pharmacist', e.target.checked)}
                  disabled={!isAdmin}
                  className="accent-blue-600"
                />
                <span className="text-sm text-gray-700">แสดงชื่อเภสัชกรบนใบเสร็จ</span>
              </label>
              {form.receipt.show_pharmacist && (
                <p className="text-xs text-gray-400 mt-1 pl-6">
                  ดึงชื่อจากแท็บ "เภสัชกร" — {form.pharmacist.name || <span className="italic text-amber-600">ยังไม่ได้ตั้งชื่อ</span>}
                </p>
              )}
            </div>
          </>
        )}

        {/* ───── Stock tab ───── */}
        {tab === 'stock' && (
          <>
            <div>
              <label className={labelCls}>
                Threshold ยาใกล้หมด <span className="text-gray-400 font-normal">(เมื่อ min_stock ของยา = 0)</span>
              </label>
              <input
                type="number"
                min="0" step="1"
                value={form.stock.low_stock_threshold}
                onChange={e => setStock('low_stock_threshold', +e.target.value || 0)}
                disabled={!isAdmin}
                className={inputCls}
              />
              <p className="text-xs text-gray-400 mt-1">
                ยาที่ stock ≤ ค่านี้ จะขึ้น badge "ใกล้หมด" และถูกนับใน Report Summary
              </p>
            </div>

            <div className="pt-3 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700 mb-2">แนะนำสั่งซื้อ (Auto Re-order)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>วิเคราะห์ย้อนหลัง (วัน)</label>
                  <input
                    type="number"
                    min="1" max="365" step="1"
                    value={form.stock.reorder_days}
                    onChange={e => setStock('reorder_days', +e.target.value || 30)}
                    disabled={!isAdmin}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>ให้มีสต็อกคลุม (วัน)</label>
                  <input
                    type="number"
                    min="1" max="180" step="1"
                    value={form.stock.reorder_lookahead}
                    onChange={e => setStock('reorder_lookahead', +e.target.value || 14)}
                    disabled={!isAdmin}
                    className={inputCls}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                ใช้เป็นค่าเริ่มต้นในหน้า "แนะนำสั่งซื้อ" (user ยังปรับได้ต่อครั้ง)
              </p>
            </div>

            <div className="pt-3 border-t border-gray-100">
              <label className={labelCls}>แจ้งเตือนล็อตใกล้หมดอายุ (วัน)</label>
              <input
                type="number"
                min="1" max="365" step="1"
                value={form.stock.expiring_days}
                onChange={e => setStock('expiring_days', +e.target.value || 60)}
                disabled={!isAdmin}
                className={inputCls}
              />
              <p className="text-xs text-gray-400 mt-1">
                ล็อตที่จะหมดอายุภายใน N วัน จะขึ้น Bell icon บน topbar
              </p>
            </div>
          </>
        )}

        {/* ───── Pharmacist tab ───── */}
        {tab === 'pharmacist' && (
          <>
            <div>
              <label className={labelCls}>ชื่อ-นามสกุล เภสัชกร</label>
              <input
                type="text"
                value={form.pharmacist.name}
                onChange={e => setPharmacist('name', e.target.value)}
                disabled={!isAdmin}
                placeholder="เช่น ภก. สมชาย ใจดี"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>เลขที่ใบประกอบวิชาชีพ</label>
              <input
                type="text"
                value={form.pharmacist.license_no}
                onChange={e => setPharmacist('license_no', e.target.value)}
                disabled={!isAdmin}
                placeholder="เช่น ภ.12345"
                className={inputCls}
              />
            </div>
            <p className="text-xs text-gray-400">
              ใช้แสดงบนใบเสร็จ (ถ้าเปิดสวิตช์ในแท็บใบเสร็จ) และ pre-fill ช่องเภสัชกรใน ขย.11 อัตโนมัติ
            </p>
          </>
        )}

        {/* ───── KY tab ───── */}
        {tab === 'ky' && (
          <>
            <div>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.ky.skip_auto}
                  onChange={e => setKy('skip_auto', e.target.checked)}
                  disabled={!isAdmin}
                  className="accent-blue-600 mt-0.5"
                />
                <div>
                  <div className="text-sm text-gray-700 font-medium">ข้ามบันทึก ขย. อัตโนมัติ</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    เปิดใช้สำหรับร้านที่ไม่ได้บันทึก compliance — ขายยาควบคุม (ขย.10/11/12) โดยไม่เปิดฟอร์มบันทึก
                  </div>
                </div>
              </label>
            </div>

            <div className="pt-3 border-t border-gray-100">
              <label className={labelCls}>ที่อยู่ผู้ซื้อเริ่มต้น (ขย.10)</label>
              <textarea
                value={form.ky.default_buyer_address}
                onChange={e => setKy('default_buyer_address', e.target.value)}
                disabled={!isAdmin}
                rows={2}
                placeholder="เช่น อุบลราชธานี"
                className={inputCls}
              />
              <p className="text-xs text-gray-400 mt-1">
                pre-fill ช่อง "ที่อยู่" ใน KySaleModal (user ยังพิมพ์ทับได้)
              </p>
            </div>
          </>
        )}

        {/* ───── Import tab ───── */}
        {tab === 'import' && (
          <>
            <div className="border border-amber-200 rounded-lg p-4 bg-amber-50">
              <div className="flex items-start gap-3">
                <span className="text-2xl" aria-hidden="true">📄</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-amber-900 mb-1">นำเข้าจาก JSON</div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    อัปโหลดไฟล์ JSON (array of products) จากระบบเก่า — เช่น export จาก MongoDB ของ aigx.
                    ไฟล์ต้องมี field: <code className="font-mono text-[10px]">name, price, costPrice, unit, serialNumber, quantity</code>.
                    ยาที่มี stock {'>'} 0 จะถูกสร้างโดยยังไม่มีล็อต — ไปเพิ่มล็อตในหน้ารายการยาภายหลัง
                  </p>
                </div>
                {isAdmin && (
                  <Button
                    onClick={() => setShowImportJson(true)}
                    className="shrink-0 border-amber-300 text-amber-700 bg-white hover:bg-amber-50"
                    variant="secondary"
                  >
                    เปิดตัวนำเข้า
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-400">
              การนำเข้า Excel + แนะนำสั่งซื้อ ยังอยู่ที่หน้า "สต็อกยา" ตามเดิม
            </p>
          </>
        )}

        {/* Save (hidden in Import tab — it has its own flow) */}
        {tab !== 'import' && (
          isAdmin ? (
            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </Button>
            </div>
          ) : (
            <div className="pt-3 border-t border-gray-100 text-xs text-gray-400 text-center">
              เฉพาะ ADMIN หรือ SUPER เท่านั้นที่แก้ไขการตั้งค่าได้
            </div>
          )
        )}
      </div>

      {showImportJson && (
        <ImportJsonModal
          onClose={() => setShowImportJson(false)}
          onImported={() => { reloadDrugs() }}
        />
      )}
    </div>
  )
}
