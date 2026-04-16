import { apiFetch } from './client'
import type { Supplier, SupplierInput } from '../types/supplier'

export const getSuppliers = (q?: string) =>
  apiFetch<Supplier[]>(`/api/suppliers${q ? `?q=${encodeURIComponent(q)}` : ''}`)

export const createSupplier = (data: SupplierInput) =>
  apiFetch<Supplier>('/api/suppliers', { method: 'POST', body: JSON.stringify(data) })

export const updateSupplier = (id: string, data: SupplierInput) =>
  apiFetch<Supplier>(`/api/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) })

export const deleteSupplier = (id: string) =>
  apiFetch<{ ok: boolean }>(`/api/suppliers/${id}`, { method: 'DELETE' })
