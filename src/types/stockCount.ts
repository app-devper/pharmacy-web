export interface StockCountInputItem {
  drug_id: string
  counted: number
}

export interface StockCountInput {
  note: string
  items: StockCountInputItem[]
}

export interface StockCountItem {
  drug_id: string
  drug_name: string
  unit: string
  system_stock: number
  counted: number
  delta: number
}

export interface StockCount {
  id: string
  count_no: string
  note: string
  items: StockCountItem[]
  created_at: string
}
