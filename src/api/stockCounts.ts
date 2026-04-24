import { apiFetch } from './client'
import type { StockCount, StockCountInput } from '../types/stockCount'

export const getStockCounts = (limit = 20) =>
  apiFetch<StockCount[]>(`/api/pharmacy/v1/stock-counts?limit=${limit}`)

export const createStockCount = (data: StockCountInput) =>
  apiFetch<StockCount>('/api/pharmacy/v1/stock-counts', {
    method: 'POST',
    body: JSON.stringify(data),
  })
