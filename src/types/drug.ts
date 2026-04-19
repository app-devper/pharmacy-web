/**
 * Dynamic tier → price map. `retail` is the default; any other key
 * ("regular", "wholesale", "vip", "staff", …) is a custom tier. 0 or missing
 * means "not set" and falls back to retail via resolvePrice().
 */
export type PriceTiers = Record<string, number>

/** Tier identifier. Any string, but `'retail'` / `'regular'` / `'wholesale'` are conventional. */
export type PriceTier = string

/** Conventional tier keys used by the default customer dropdown. */
export const BUILTIN_TIERS = ['retail', 'regular', 'wholesale'] as const

/** Alternate selling unit. 1 alt unit = `factor` base units. */
export interface AltUnit {
  name: string
  factor: number       // >= 2
  sell_price: number   // per alt unit — mirrored from prices.retail
  prices?: PriceTiers
  barcode?: string     // optional, for scanner matching
  /** If true, hide this alt unit from the sell-page picker. Base stays visible. */
  hidden?: boolean
}

export interface Drug {
  id: string
  name: string
  generic_name: string
  type: string
  strength: string
  barcode: string
  // sell_price is the new canonical field returned by the API (json:"sell_price").
  // price is kept optional for backward compat with old cached docs (bson:"price").
  sell_price?: number
  price?: number       // legacy — may appear in old MongoDB docs
  cost_price: number
  stock: number
  min_stock: number    // 0 = no alert threshold
  reg_no: string
  unit: string
  report_types: string[]
  alt_units?: AltUnit[]
  prices?: PriceTiers
  /** Earliest-expiring lot with remaining > 0. Populated by backend on list. */
  next_lot?: LotSummary
  created_at: string
}

/** Lightweight reference to a drug lot — returned on Drug list for FEFO hints. */
export interface LotSummary {
  lot_id: string
  lot_number: string
  expiry_date: string  // ISO
}

/** Resolve the sell price from either the new or legacy field name */
export function getDrugSellPrice(drug: Drug): number {
  return drug.sell_price ?? drug.price ?? 0
}

export interface DrugInput {
  name: string
  generic_name: string
  type: string
  strength: string
  barcode: string
  sell_price: number
  cost_price: number
  stock: number
  min_stock: number
  reg_no: string
  unit: string
  report_types: string[]
  alt_units?: AltUnit[]
  prices?: PriceTiers
  create_lot?: DrugLotInput
}

export interface DrugUpdate {
  name: string
  generic_name: string
  type: string
  strength: string
  barcode: string
  sell_price: number
  cost_price: number
  min_stock: number
  reg_no: string
  unit: string
  report_types: string[]
  alt_units?: AltUnit[]
  prices?: PriceTiers
}

export interface DrugLot {
  id: string
  drug_id: string
  lot_number: string
  expiry_date: string   // ISO string from backend
  import_date: string
  cost_price: number | null   // null = use drug.cost_price
  sell_price: number | null   // null = use drug.sell_price
  quantity: number            // original imported qty
  remaining: number           // current qty in this lot
  created_at: string
}

export interface ReorderSuggestion {
  drug_id: string
  drug_name: string
  unit: string
  current_stock: number
  min_stock: number
  qty_sold: number           // total over lookback window
  avg_daily_sale: number
  days_left: number          // 9999 sentinel = no sales / infinite cover
  suggested_qty: number
  cost_price: number
  sell_price: number
}

export interface DrugLotInput {
  lot_number: string
  expiry_date: string   // "YYYY-MM-DD"
  import_date: string   // "YYYY-MM-DD"
  cost_price: number | null
  sell_price: number | null
  quantity: number
}

export const DRUG_TYPES = ['ยาสามัญ', 'ยาแผนปัจจุบัน', 'ยาสมุนไพร', 'อาหารเสริม']
export const DRUG_UNITS = [
  'เม็ด', 'แคปซูล', 'ซอง', 'ขวด', 'กล่อง', 'หลอด',
  'แผง', 'ถุง', 'ชิ้น', 'อัน', 'ชุด', 'ขวดเล็ก', 'ขวดใหญ่',
  'มล.', 'ลิตร', 'กรัม', 'มก.',
]

export const KY_REPORT_OPTIONS = [
  { value: 'ky9',  label: 'ขย.9',  desc: 'บัญชีการซื้อยา',    color: 'bg-blue-100 text-blue-700' },
  { value: 'ky10', label: 'ขย.10', desc: 'ยาควบคุมพิเศษ',     color: 'bg-purple-100 text-purple-700' },
  { value: 'ky11', label: 'ขย.11', desc: 'ยาอันตราย',          color: 'bg-red-100 text-red-700' },
  { value: 'ky12', label: 'ขย.12', desc: 'ยาตามใบสั่งแพทย์',  color: 'bg-teal-100 text-teal-700' },
]
