export const ADJUSTMENT_REASONS = ['นับสต็อก', 'ยาเสียหาย', 'ยาหมดอายุ', 'สูญหาย', 'อื่นๆ'] as const
export type AdjustmentReason = typeof ADJUSTMENT_REASONS[number]

export interface StockAdjustment {
  id: string
  drug_id: string
  drug_name: string
  delta: number
  before: number
  after: number
  reason: AdjustmentReason
  note: string
  created_at: string
}

export interface StockAdjustmentInput {
  delta: number
  reason: AdjustmentReason | ''
  note: string
  /** Where an increase of a lot-tracked drug goes (pharmacy-api ADR-0007). */
  lot?: LotTarget
}

/** An existing lot, or a new lot with its number and expiry (YYYY-MM-DD). */
export type LotTarget = { lot_id: string } | { lot_number: string; expiry_date: string }
