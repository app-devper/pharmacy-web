export interface Customer {
  id: string
  name: string
  phone: string
  disease: string
  total_spent: number
  last_visit: string | null
  created_at: string
}

export interface CustomerInput {
  name: string
  phone: string
  disease: string
}
