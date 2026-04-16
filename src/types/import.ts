export interface POItem {
  drug_id: string
  drug_name: string
  lot_number: string
  expiry_date: string   // "YYYY-MM-DD"
  qty: number
  cost_price: number
  sell_price: number | null
}

// Used when building the form rows (string fields for inputs)
export interface POItemInput {
  drug_id: string
  drug_name: string
  lot_number: string
  expiry_date: string
  qty: string
  cost_price: string
  sell_price: string    // empty string = null
}

export interface POInput {
  supplier: string
  invoice_no: string
  receive_date: string  // "YYYY-MM-DD"
  notes: string
  items: POItem[]
}

// Full document (returned by GET /api/imports/:id)
export interface PurchaseOrder {
  id: string
  doc_no: string
  supplier: string
  invoice_no: string
  receive_date: string
  items: POItem[]
  item_count: number
  total_cost: number
  status: 'draft' | 'confirmed'
  notes: string
  created_at: string
  confirmed_at: string | null
}

// Summary (returned by GET /api/imports — items excluded)
export interface PurchaseOrderSummary {
  id: string
  doc_no: string
  supplier: string
  invoice_no: string
  receive_date: string
  item_count: number
  total_cost: number
  status: 'draft' | 'confirmed'
  notes: string
  created_at: string
  confirmed_at: string | null
}
