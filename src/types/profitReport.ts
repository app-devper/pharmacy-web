export interface DrugProfit {
  drug_id: string
  drug_name: string
  qty_sold: number
  revenue: number
  cost: number
  profit: number
  margin: number
}

export interface ProfitSummary {
  revenue: number
  cost: number
  profit: number
  margin: number
  bills: number
}

export interface ProfitReport {
  summary: ProfitSummary
  by_drug: DrugProfit[]
}
