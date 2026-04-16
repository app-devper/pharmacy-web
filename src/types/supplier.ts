export interface Supplier {
  id: string
  name: string
  contact_name: string
  phone: string
  address: string
  tax_id: string
  notes: string
  created_at: string
}

export interface SupplierInput {
  name: string
  contact_name: string
  phone: string
  address: string
  tax_id: string
  notes: string
}
