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
  created_at: string
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
