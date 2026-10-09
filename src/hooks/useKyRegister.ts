import { useCallback, useEffect, useState } from 'react'
import { missingFields, toInput, type KyForm, type KyRegister } from '../lib/kyRegister'
import { monthBangkok } from '../utils/date'
import { useToast } from './useToast'

/**
 * One KY register page's behaviour: the month shown and its rows, and the
 * add form (blank, checked against the register's required fields, saved,
 * then the month reloaded). The page only lays out columns and inputs.
 */
export function useKyRegister<Row, Input>(register: KyRegister<Row, Input>, blank: () => KyForm<Input>) {
  const showToast = useToast()
  const [month, setMonth] = useState(() => monthBangkok())
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<KyForm<Input> | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setRows(await register.list(month)) }
    catch (e: unknown) { showToast((e as Error).message, 'error') }
    finally { setLoading(false) }
  }, [register, month, showToast])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!form) return
    if (missingFields(register, form).length > 0) { showToast('กรุณากรอกข้อมูลให้ครบ', 'error'); return }
    setSaving(true)
    try {
      await register.add(toInput(register, form))
      showToast('บันทึกสำเร็จ')
      setForm(null)
      load()
    } catch (e: unknown) { showToast((e as Error).message, 'error') }
    finally { setSaving(false) }
  }

  return {
    month, setMonth, rows, loading, reload: load,
    exportXlsx: () => register.exportXlsx(rows, month),
    /** The add form while it is open. */
    form,
    open: () => setForm(blank()),
    close: () => setForm(null),
    set: (key: keyof KyForm<Input> & string, value: string) => setForm(f => (f ? { ...f, [key]: value } : f)),
    save, saving,
  }
}
