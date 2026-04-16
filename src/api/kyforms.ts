import { apiFetch } from './client'
import { Ky9, Ky9Input, Ky10, Ky10Input, Ky11, Ky11Input, Ky12, Ky12Input } from '../types/kyforms'

export const getKy9 = (month?: string) =>
  apiFetch<Ky9[]>(`/api/ky9${month ? `?month=${month}` : ''}`)
export const addKy9 = (data: Ky9Input) =>
  apiFetch<{ id: string; total_value: number }>('/api/ky9', { method: 'POST', body: JSON.stringify(data) })

export const getKy10 = (month?: string) =>
  apiFetch<Ky10[]>(`/api/ky10${month ? `?month=${month}` : ''}`)
export const addKy10 = (data: Ky10Input) =>
  apiFetch<{ id: string }>('/api/ky10', { method: 'POST', body: JSON.stringify(data) })

export const getKy11 = (month?: string) =>
  apiFetch<Ky11[]>(`/api/ky11${month ? `?month=${month}` : ''}`)
export const addKy11 = (data: Ky11Input) =>
  apiFetch<{ id: string }>('/api/ky11', { method: 'POST', body: JSON.stringify(data) })

export const getKy12 = (month?: string) =>
  apiFetch<Ky12[]>(`/api/ky12${month ? `?month=${month}` : ''}`)
export const addKy12 = (data: Ky12Input) =>
  apiFetch<{ id: string }>('/api/ky12', { method: 'POST', body: JSON.stringify(data) })
