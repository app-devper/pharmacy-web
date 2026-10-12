import { itemBasePrice } from '../context/CartContext'
import type { Drug, PriceTier } from '../types/drug'
import type { CartItem, SaleItemInput, SaleKyCapture, StockUpdate } from '../types/sale'
import type { Submitted } from './pendingSales'

/**
 * Checkout: the rules that turn the cart into a sale intent, in one place,
 * with no React. The cart, the oversell confirmation and the KY capture are
 * views over these; useCheckout runs them.
 *
 * Every amount is per BASE unit resolved at the cart's price tier; the
 * server revalidates prices against the drug (pharmacy-api).
 */

/** One sale line per cart line, with the lot the cashier expects (drug.next_lot). */
export function saleItemsOf(
  items: CartItem[], tier: PriceTier, drugs: Drug[], allowOversell: ReadonlySet<string> = new Set(),
): SaleItemInput[] {
  return items.map(i => {
    const original = itemBasePrice(i, tier)
    const itemDisc = i.itemDiscount || 0
    const unit = i.selected_unit ?? ''
    const factor = i.selected_unit_factor ?? 1
    // The backend compares this snapshot with the lot it actually takes from
    // and flags lot_mismatch, which matters most for bills synced later.
    const next = drugs.find(d => d.id === i.id)?.next_lot
    return {
      drug_id: i.id,
      qty: i.qty,
      price: Math.max(0, original - itemDisc),
      original_price: original,
      item_discount: itemDisc,
      price_tier: tier,
      ...(unit ? { unit, unit_factor: factor } : {}),
      ...(next ? { lot_snapshot: { lot_id: next.lot_id, lot_number: next.lot_number, expiry_date: next.expiry_date } } : {}),
      ...(allowOversell.has(i.id) ? { allow_oversell: true } : {}),
    }
  })
}

export interface CartTotals {
  /** Before any discount. */
  gross: number
  itemDiscount: number
  /** After line discounts. */
  subtotal: number
  cartDiscount: number
  /** What the customer pays. */
  net: number
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** The cart's amounts. A cart discount never exceeds the subtotal. */
export function totalsOf(items: CartItem[], tier: PriceTier, discountInput: string, discountType: '฿' | '%'): CartTotals {
  const gross = items.reduce((s, i) => s + itemBasePrice(i, tier) * i.qty, 0)
  const itemDiscount = items.reduce((s, i) => s + (i.itemDiscount || 0) * i.qty, 0)
  const subtotal = round2(items.reduce((s, i) => s + Math.max(0, itemBasePrice(i, tier) - (i.itemDiscount || 0)) * i.qty, 0))
  const value = parseFloat(discountInput) || 0
  const cartDiscount = Math.max(0, discountType === '%' ? Math.min(subtotal * value / 100, subtotal) : Math.min(value, subtotal))
  return { gross, itemDiscount, subtotal, cartDiscount, net: subtotal - cartDiscount }
}

export interface OversoldLine {
  drug_id: string
  drug_name: string
  /** Base units the cart sells. */
  need: number
  /** Stock on hand in base units (may be 0 or negative). */
  available: number
  unit?: string
  unit_factor?: number
}

/** Drugs the cart sells more of than is on hand, one row per drug. */
export function oversoldLines(items: CartItem[], drugs: Drug[]): OversoldLine[] {
  const need = new Map<string, number>()
  for (const i of items) need.set(i.id, (need.get(i.id) ?? 0) + i.qty)
  const out: OversoldLine[] = []
  for (const [drugId, qty] of need) {
    const d = drugs.find(x => x.id === drugId)
    const stock = d?.stock ?? 0
    if (qty <= Math.max(0, stock)) continue
    const first = items.find(i => i.id === drugId)
    out.push({
      drug_id: drugId, drug_name: d?.name ?? first?.name ?? drugId, need: qty, available: stock,
      unit: first?.selected_unit, unit_factor: first?.selected_unit_factor,
    })
  }
  return out
}

export type KyForm = 'ky10' | 'ky11' | 'ky12'
const KY_FORMS: KyForm[] = ['ky10', 'ky11', 'ky12']

/** The KY forms this cart's sale needs; none when the shop skips KY capture. */
export function kyFormsNeeded(items: CartItem[], skipKy: boolean): KyForm[] {
  if (skipKy) return []
  return KY_FORMS.filter(f => items.some(i => i.report_types?.includes(f)))
}

/** The fields each register requires, as pharmacy-api checks them. */
const REQUIRED: { [F in KyForm]: (keyof NonNullable<SaleKyCapture[F]>)[] } = {
  ky10: ['buyer_name', 'buyer_address'],
  ky11: ['buyer_name', 'purpose', 'pharmacist'],
  ky12: ['rx_no', 'patient_name', 'doctor'],
}

/** Required fields the capture leaves empty, as "ky10.buyer_name". */
export function missingKyFields(capture: SaleKyCapture, forms: KyForm[]): string[] {
  const missing: string[] = []
  for (const f of forms) {
    const fields = (capture[f] ?? {}) as Record<string, string | undefined>
    for (const field of REQUIRED[f] as string[]) {
      if (!fields[field]?.trim()) missing.push(`${f}.${field}`)
    }
  }
  return missing
}

/** How the drug list catches up with a submitted sale. */
export type StockCatchUp =
  | { kind: 'patch'; updates: StockUpdate[] }
  | { kind: 'reload' }

/**
 * A confirmed sale's stock comes from the server. A pending sale's is
 * estimated from the stock on hand (never below zero) until replay confirms
 * it and the list reloads.
 */
export function stockCatchUp(submitted: Submitted, saleItems: SaleItemInput[], drugs: Drug[]): StockCatchUp {
  if (submitted.status === 'confirmed') {
    const updates = submitted.sale.stock_updates ?? []
    return updates.length > 0 ? { kind: 'patch', updates } : { kind: 'reload' }
  }
  const used = new Map<string, number>()
  for (const it of saleItems) used.set(it.drug_id, (used.get(it.drug_id) ?? 0) + it.qty)
  const updates: StockUpdate[] = []
  for (const [id, qty] of used) {
    const d = drugs.find(x => x.id === id)
    if (d) updates.push({ drug_id: id, new_stock: Math.max(0, d.stock - qty) })
  }
  return { kind: 'patch', updates }
}
