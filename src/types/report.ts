import type { Sale } from './sale'

export interface ReportSummary {
  today_sales: number
  today_bills: number
  month_sales: number
  stock_value: number
  low_stock: number
  out_stock: number
}

export interface DailyData {
  day: string
  total: number
}

export interface TopDrug {
  drug_id: string
  drug_name: string
  qty_sold: number
  revenue: number
}

export interface SlowDrug {
  drug_id: string
  drug_name: string
  stock: number
  unit: string
}

export interface MonthlyData {
  month: string   // "YYYY-MM"
  revenue: number
  cost: number
  profit: number
}

export interface EodReport {
  date: string           // YYYY-MM-DD
  bill_count: number
  total_sales: number    // sum of sale.total (after discount)
  total_discount: number
  total_received: number
  total_change: number
  net_cash: number       // total_received - total_change
  bills: Sale[]
}
