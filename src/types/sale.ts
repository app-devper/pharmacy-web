import type { Drug } from './drug'
import type { Customer } from './customer'

export interface SaleItemInput {
  drug_id: string
  qty: number
  price: number
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
  qty: number
  price: number
  subtotal: number
}

export interface SaleResponse {
  bill_no: string
  discount: number
  total: number
  change: number
}

export interface CartItem extends Drug {
  qty: number
  itemDiscount: number   // ฿ ส่วนลดต่อหน่วยของรายการนี้
}

export interface ParkedSlot {
  items: CartItem[]
  customer: Customer | null
  discountInput: string
  discountType: '฿' | '%'
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
