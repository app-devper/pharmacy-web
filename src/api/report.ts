import { apiFetch } from './client'
import { ReportSummary, DailyData, EodReport, TopDrug, SlowDrug, MonthlyData } from '../types/report'
import type { ProfitReport } from '../types/profitReport'

export const getSummary = () => apiFetch<ReportSummary>('/api/report/summary')

export const getDaily = (days = 7) => apiFetch<DailyData[]>(`/api/report/daily?days=${days}`)

export const getEod = (date?: string) =>
  apiFetch<EodReport>(`/api/report/eod${date ? `?date=${date}` : ''}`)

export const getProfitReport = (from: string, to: string) =>
  apiFetch<ProfitReport>(`/api/report/profit?from=${from}&to=${to}`)

export const getTopDrugs  = (days = 30)   => apiFetch<TopDrug[]>(`/api/report/top-drugs?days=${days}`)
export const getSlowDrugs = (days = 90)   => apiFetch<SlowDrug[]>(`/api/report/slow-drugs?days=${days}`)
export const getMonthly   = (months = 12) => apiFetch<MonthlyData[]>(`/api/report/monthly?months=${months}`)
