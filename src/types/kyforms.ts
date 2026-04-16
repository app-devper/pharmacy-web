export interface Ky9 {
  id: string
  date: string
  drug_name: string
  reg_no: string
  unit: string
  qty: number
  price_per_unit: number
  total_value: number
  seller: string
  invoice_no: string
  created_at: string
}

export interface Ky9Input {
  date: string
  drug_name: string
  reg_no: string
  unit: string
  qty: number
  price_per_unit: number
  seller: string
  invoice_no: string
}

export interface Ky10 {
  id: string
  date: string
  drug_name: string
  reg_no: string
  qty: number
  unit: string
  buyer_name: string
  buyer_address: string
  rx_no: string
  doctor: string
  balance: number
  created_at: string
}

export interface Ky10Input {
  date: string
  drug_name: string
  reg_no: string
  qty: number
  unit: string
  buyer_name: string
  buyer_address: string
  rx_no: string
  doctor: string
  balance: number
}

export interface Ky11 {
  id: string
  date: string
  drug_name: string
  reg_no: string
  qty: number
  unit: string
  buyer_name: string
  purpose: string
  pharmacist: string
  created_at: string
}

export interface Ky11Input {
  date: string
  drug_name: string
  reg_no: string
  qty: number
  unit: string
  buyer_name: string
  purpose: string
  pharmacist: string
}

export interface Ky12 {
  id: string
  date: string
  rx_no: string
  patient_name: string
  doctor: string
  hospital: string
  drug_name: string
  qty: number
  unit: string
  total_value: number
  status: string
  created_at: string
}

export interface Ky12Input {
  date: string
  rx_no: string
  patient_name: string
  doctor: string
  hospital: string
  drug_name: string
  qty: number
  unit: string
  total_value: number
  status: string
}
