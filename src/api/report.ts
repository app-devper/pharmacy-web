import { apiFetch } from './client'
import { ReportSummary, DailyData, EodReport, TopDrug, SlowDrug, MonthlyData, Dashboard } from '../types/report'
import type { ProfitReport } from '../types/profitReport'

export const getSummary = () => apiFetch<ReportSummary>('/api/pharmacy/v1/report/summary')

/** Combined endpoint that returns summary + daily + monthly + recent_sales in one round-trip. */
export const getDashboard = (days = 7) =>
  apiFetch<Dashboard>(`/api/pharmacy/v1/report/dashboard?days=${days}`)

export const getDaily = (days = 7) => apiFetch<DailyData[]>(`/api/pharmacy/v1/report/daily?days=${days}`)

export const getEod = (date?: string) =>
  apiFetch<EodReport>(`/api/pharmacy/v1/report/eod${date ? `?date=${date}` : ''}`)

export const getProfitReport = (from: string, to: string) =>
  apiFetch<ProfitReport>(`/api/pharmacy/v1/report/profit?from=${from}&to=${to}`)

export const getTopDrugs  = (days = 30)   => apiFetch<TopDrug[]>(`/api/pharmacy/v1/report/top-drugs?days=${days}`)
export const getSlowDrugs = (days = 90)   => apiFetch<SlowDrug[]>(`/api/pharmacy/v1/report/slow-drugs?days=${days}`)
export const getMonthly   = (months = 12) => apiFetch<MonthlyData[]>(`/api/pharmacy/v1/report/monthly?months=${months}`)
