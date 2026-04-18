import type { PriceTier } from './drug'

export interface Customer {
  id: string
  name: string
  phone: string
  disease: string
  /** Default tier auto-applied when this customer is picked in Cart. "" = retail. */
  price_tier?: PriceTier | ''
  total_spent: number
  last_visit: string | null
  created_at: string
}

export interface CustomerInput {
  name: string
  phone: string
  disease: string
  price_tier?: PriceTier | ''
}
