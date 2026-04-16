import { apiFetch } from './client'
import { PurchaseOrderSummary, PurchaseOrder, POInput } from '../types/import'

export const getImports = () =>
  apiFetch<PurchaseOrderSummary[]>('/api/imports')

export const getImportsBySupplier = (supplier: string) =>
  apiFetch<PurchaseOrderSummary[]>(`/api/imports?supplier=${encodeURIComponent(supplier)}`)

export const getImport = (id: string) =>
  apiFetch<PurchaseOrder>(`/api/imports/${id}`)

export const createImport = (data: POInput) =>
  apiFetch<PurchaseOrder>('/api/imports', { method: 'POST', body: JSON.stringify(data) })

export const updateImport = (id: string, data: POInput) =>
  apiFetch<PurchaseOrder>(`/api/imports/${id}`, { method: 'PUT', body: JSON.stringify(data) })

export const confirmImport = (id: string) =>
  apiFetch<PurchaseOrder>(`/api/imports/${id}/confirm`, { method: 'POST' })

export const deleteImport = (id: string) =>
  apiFetch<{ ok: boolean }>(`/api/imports/${id}`, { method: 'DELETE' })
