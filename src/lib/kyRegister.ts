import { addKy10, addKy11, addKy12, addKy9, getKy10, getKy11, getKy12, getKy9 } from '../api/kyforms'
import type { Ky10, Ky10Input, Ky11, Ky11Input, Ky12, Ky12Input, Ky9, Ky9Input } from '../types/kyforms'
import { exportKy10Xlsx, exportKy11Xlsx, exportKy12Xlsx, exportKy9Xlsx } from '../utils/exportXlsx'

/**
 * A KY register (ขย.9–12, Compliance): how to read a month of it, add a row,
 * which fields a row needs, and how to export it. pharmacy-api's compliance
 * module is the authority; `required` mirrors it so the form says what is
 * missing before the server refuses. Fields the shop fills by default
 * (ขย.10 buyer address, ขย.11 pharmacist) are left to the server.
 */
export interface KyRegister<Row, Input> {
  label: string
  list: (month: string) => Promise<Row[]>
  add: (input: Input) => Promise<unknown>
  required: (keyof Input & string)[]
  /** Form fields entered as text that the register stores as numbers. */
  numbers: (keyof Input & string)[]
  exportXlsx: (rows: Row[], month: string) => void
}

export const KY9: KyRegister<Ky9, Ky9Input> = {
  label: 'ขย.9', list: getKy9, add: addKy9, exportXlsx: exportKy9Xlsx,
  required: ['date', 'drug_name', 'qty'], numbers: ['qty', 'price_per_unit'],
}
export const KY10: KyRegister<Ky10, Ky10Input> = {
  label: 'ขย.10', list: getKy10, add: addKy10, exportXlsx: exportKy10Xlsx,
  required: ['date', 'drug_name', 'qty', 'buyer_name'], numbers: ['qty', 'balance'],
}
export const KY11: KyRegister<Ky11, Ky11Input> = {
  label: 'ขย.11', list: getKy11, add: addKy11, exportXlsx: exportKy11Xlsx,
  required: ['date', 'drug_name', 'qty', 'buyer_name', 'purpose'], numbers: ['qty'],
}
export const KY12: KyRegister<Ky12, Ky12Input> = {
  label: 'ขย.12', list: getKy12, add: addKy12, exportXlsx: exportKy12Xlsx,
  required: ['date', 'drug_name', 'qty', 'rx_no', 'patient_name', 'doctor'], numbers: ['qty', 'total_value'],
}

/** A form as typed: every field text (the sale link is never typed by hand). */
export type KyForm<Input> = { [K in Exclude<keyof Input, 'sale_id'>]-?: string }

/** Required fields the form leaves empty (a quantity must be above zero). */
export function missingFields<Row, Input>(register: KyRegister<Row, Input>, form: KyForm<Input>): string[] {
  return register.required.filter(k => {
    const v = ((form as Record<string, string>)[k] ?? '').trim()
    return register.numbers.includes(k) ? !(Number(v) > 0) : v === ''
  })
}

/** The form as the register's input: text trimmed, numbers parsed (blank is 0). */
export function toInput<Row, Input>(register: KyRegister<Row, Input>, form: KyForm<Input>): Input {
  const out: Record<string, string | number> = {}
  for (const [k, v] of Object.entries(form) as [string, string][]) {
    out[k] = register.numbers.includes(k as keyof Input & string) ? (Number(v) || 0) : v.trim()
  }
  return out as Input
}
