import type { DrugInput, DrugUpdate } from '../types/drug'
import { KY_REPORT_OPTIONS } from '../types/drug'

/**
 * Drug draft: the one place that turns what a person typed (a form, an Excel
 * row, an imported JSON record) into a DrugInput / DrugUpdate, with the same
 * defaults, number parsing and checks everywhere. Pages and import modals are
 * adapters onto it, like kyRegister is for the ขย. registers.
 *
 * Bulk import stays more permissive than a single create (pharmacy-api keeps
 * the same split): it skips the lot rule, but shares everything else.
 */

/** A drug as typed: every field is text, report types as a list or "ky10, ky11". */
export interface DrugDraft {
  name: string
  generic_name?: string
  type?: string
  strength?: string
  barcode?: string
  /** Retail price per base unit. */
  retail?: string | number
  cost_price?: string | number
  stock?: string | number
  min_stock?: string | number
  reg_no?: string
  unit?: string
  report_types?: string | string[]
}

export interface LotDraft {
  lot_number: string
  expiry_date: string
  import_date?: string
}

export interface DraftDefaults {
  type: string
  unit: string
}

export const DRUG_DEFAULTS: DraftDefaults = { type: 'ยาสามัญ', unit: 'เม็ด' }

const KNOWN_REPORT_TYPES = new Set(KY_REPORT_OPTIONS.map(o => o.value))

const text = (v: unknown) => (v == null ? '' : String(v).trim())

/** A non-negative number from text; anything unreadable is 0. */
const amount = (v: unknown) => Math.max(0, Number(text(v).replace(/,/g, '')) || 0)

/** A non-negative whole number of base units. */
const units = (v: unknown) => Math.floor(amount(v))

/**
 * Report types in the form pharmacy-api stores them ('ky9'…'ky12').
 * Accepts 'ขย.10', 'KY10', 'ky 10'; anything else is reported, not dropped,
 * because a misspelt type would silently stop the ขย. form being required.
 */
export function reportTypesOf(value: string | string[] | undefined): { types: string[]; unknown: string[] } {
  const raw = Array.isArray(value) ? value : text(value).split(',')
  const types: string[] = []
  const unknown: string[] = []
  for (const r of raw) {
    const t = text(r)
    if (!t) continue
    const key = t.toLowerCase().replace(/^ขย\.?\s*/, 'ky').replace(/\s+/g, '')
    if (!KNOWN_REPORT_TYPES.has(key)) unknown.push(t)
    else if (!types.includes(key)) types.push(key)
  }
  return { types, unknown }
}

/** The fields a create and an update share. */
function drugFields(d: DrugDraft, defaults: DraftDefaults): DrugUpdate {
  const retail = amount(d.retail)
  return {
    name: text(d.name),
    generic_name: text(d.generic_name),
    type: text(d.type) || defaults.type,
    strength: text(d.strength),
    barcode: text(d.barcode),
    sell_price: retail,
    cost_price: amount(d.cost_price),
    min_stock: units(d.min_stock),
    reg_no: text(d.reg_no),
    unit: text(d.unit) || defaults.unit,
    report_types: reportTypesOf(d.report_types).types,
  }
}

/**
 * A new drug. With a lot it is a single create: opening stock goes into that
 * lot. Without one it is a bulk-import row.
 */
export function newDrugInput(d: DrugDraft, { lot, defaults = DRUG_DEFAULTS }: { lot?: LotDraft; defaults?: DraftDefaults } = {}): DrugInput {
  const fields = drugFields(d, defaults)
  const stock = units(d.stock)
  return {
    ...fields,
    stock,
    // Only retail is set on creation; extra tiers are added in the edit page.
    prices: { retail: fields.sell_price },
    ...(lot && stock > 0 ? {
      create_lot: {
        lot_number: text(lot.lot_number),
        expiry_date: lot.expiry_date,
        import_date: lot.import_date || '',
        cost_price: null,
        sell_price: null,
        quantity: stock,
      },
    } : {}),
  }
}

/** The base fields of an edit; alt units and price tiers come from their editors. */
export function drugUpdateOf(d: DrugDraft, extras: Pick<DrugUpdate, 'alt_units' | 'prices'>): DrugUpdate {
  return { ...drugFields(d, DRUG_DEFAULTS), ...extras }
}

/**
 * Why a draft cannot be saved yet, in the order a person should fix it.
 * Pass the lot for a single create; opening stock then needs a lot number
 * and an expiry date.
 */
export function draftProblems(d: DrugDraft, { lot }: { lot?: LotDraft } = {}): string[] {
  const problems: string[] = []
  if (!text(d.name)) problems.push('กรุณากรอกชื่อยา')
  const { unknown } = reportTypesOf(d.report_types)
  if (unknown.length) problems.push(`ประเภทรายงานไม่ถูกต้อง: ${unknown.join(', ')} (ใช้ ky9–ky12)`)
  if (lot && units(d.stock) > 0) {
    if (!text(lot.lot_number)) problems.push('กรุณากรอกเลขล็อต')
    if (!lot.expiry_date) problems.push('กรุณาระบุวันหมดอายุ')
  }
  return problems
}
