import type { Drug, PriceTier } from './drug'
import type { Customer } from './customer'

export interface SaleItemInput {
  drug_id: string
  qty: number                  // BASE units
  price: number                // per BASE unit
  original_price?: number
  item_discount?: number
  unit?: string                // alt-unit name; "" or omit = base unit
  unit_factor?: number         // 1 = base, >=2 = alt
  price_tier?: PriceTier       // "" default = retail
}

export interface SaleInput {
  customer_id?: string
  items: SaleItemInput[]
  discount?: number
  received: number
}

export interface Sale {
  id: string
  bill_no: string
  customer_id: string | null
  customer_name: string
  discount: number
  total: number
  received: number
  change: number
  sold_at: string
  voided?: boolean
  void_reason?: string
  voided_at?: string
}

export interface SaleItem {
  id: string
  sale_id: string
  drug_id: string
  drug_name: string
  qty: number                  // BASE units
  price: number                // per BASE unit
  original_price?: number
  item_discount?: number
  subtotal: number
  unit?: string                // alt-unit display name; "" = base
  unit_factor?: number         // 1 = base, >=2 = alt
  price_tier?: PriceTier       // "" default = retail
}

export interface StockUpdate {
  drug_id: string
  new_stock: number
}

export interface SaleResponse {
  bill_no: string
  discount: number
  total: number
  change: number
  stock_updates?: StockUpdate[]
}

export interface CartItem extends Drug {
  qty: number                // BASE units (e.g. "2 แผง × 10" = 20)
  itemDiscount: number       // ฿ ส่วนลดต่อ **base** unit
  /** Alt-unit display name. "" or undefined = sell in base unit. */
  selected_unit?: string
  /** Conversion factor of the selected alt unit. 1 = base unit. */
  selected_unit_factor?: number
  /** Unit sell price as set on the drug's alt_unit; overrides getDrugSellPrice(base) × factor. */
  selected_unit_price?: number
}

export interface ParkedSlot {
  items: CartItem[]
  customer: Customer | null
  discountInput: string
  discountType: '฿' | '%'
  priceTier?: PriceTier   // persisted cart-wide pricing tier
  parkedAt: number       // Date.now()
}

// ─── Drug Return ──────────────────────────────────────────────────────────────

export interface ReturnItem {
  sale_item_id: string
  drug_id: string
  drug_name: string
  qty: number
  price: number
  subtotal: number
}

export interface DrugReturn {
  id: string
  return_no: string
  sale_id: string
  bill_no: string
  customer_name: string
  items: ReturnItem[]
  refund: number
  reason: string
  returned_at: string
}

export interface ReturnItemInput {
  sale_item_id: string
  qty: number
}

export interface DrugReturnInput {
  items: ReturnItemInput[]
  reason: string
}
