export type MovementType = 'import' | 'sale' | 'return' | 'adjustment' | 'writeoff' | 'void'

/** How a movement type reads on screen and in the export. */
export const MOVEMENT_LABELS: Record<MovementType, string> = {
  import: 'นำเข้า',
  sale: 'ขาย',
  return: 'คืนยา',
  adjustment: 'ปรับสต็อก',
  writeoff: 'ตัดสต็อก',
  void: 'ยกเลิกบิล',
}

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
