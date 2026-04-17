import { apiFetch } from './client'
import { Drug, DrugInput, DrugUpdate, DrugLot, DrugLotInput } from '../types/drug'

export const getDrugs = () => apiFetch<Drug[]>('/api/drugs')

export const getLowStockDrugs = () => apiFetch<Drug[]>('/api/drugs/low-stock')

export const addDrug = (data: DrugInput) =>
  apiFetch<Drug>('/api/drugs', { method: 'POST', body: JSON.stringify(data) })

export const updateDrug = (id: string, data: DrugUpdate) =>
  apiFetch<{ ok: boolean }>(`/api/drugs/${id}`, { method: 'PUT', body: JSON.stringify(data) })

// Bulk import API
export interface BulkImportRowError {
  row: number
  name: string
  message: string
}

export interface BulkImportResult {
  imported: number
  errors: BulkImportRowError[]
}

export const bulkImportDrugs = (drugs: DrugInput[]) =>
  apiFetch<BulkImportResult>('/api/drugs/bulk', {
    method: 'POST',
    body: JSON.stringify({ drugs }),
  })

// Lot API
export const getLots = (drugId: string) =>
  apiFetch<DrugLot[]>(`/api/drugs/${drugId}/lots`)

export const addLot = (drugId: string, data: DrugLotInput) =>
  apiFetch<DrugLot>(`/api/drugs/${drugId}/lots`, { method: 'POST', body: JSON.stringify(data) })

export const deleteLot = (drugId: string, lotId: string) =>
  apiFetch<{ ok: boolean }>(`/api/drugs/${drugId}/lots/${lotId}`, { method: 'DELETE' })
