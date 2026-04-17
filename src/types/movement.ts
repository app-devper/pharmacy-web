export type MovementType = 'import' | 'sale' | 'return' | 'adjustment' | 'writeoff'

export interface Movement {
  id: string
  type: MovementType
  drug_id: string
  drug_name: string
  delta: number       // positive = stock in, negative = stock out
  reference: string   // bill_no / lot_number / return_no / reason
  note: string
  at: string          // ISO timestamp
}

export interface MovementsResponse {
  total: number
  items: Movement[]
}
