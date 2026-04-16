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
}
