import { apiFetch } from './client'
import { Drug, DrugInput, DrugUpdate, DrugLot, DrugLotInput, ReorderSuggestion } from '../types/drug'

/**
 * Fetch the full drug list. Used once by DrugsProvider; all pages share the cache.
 * Backend also supports `?fields=compact` projection for other consumers that want
 * a slimmer payload (e.g. direct scripts), but the in-app cache needs full fields.
 */
export const getDrugs = () => apiFetch<Drug[]>('/api/pharmacy/v1/drugs')

export const getReorderSuggestions = (days = 30, lookahead = 14) =>
  apiFetch<ReorderSuggestion[]>(`/api/pharmacy/v1/drugs/reorder-suggestions?days=${days}&lookahead=${lookahead}`)

export const addDrug = (data: DrugInput) =>
  apiFetch<Drug>('/api/pharmacy/v1/drugs', { method: 'POST', body: JSON.stringify(data) })

export const updateDrug = (id: string, data: DrugUpdate) =>
  apiFetch<{ ok: boolean }>(`/api/pharmacy/v1/drugs/${id}`, { method: 'PUT', body: JSON.stringify(data) })

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
  apiFetch<BulkImportResult>('/api/pharmacy/v1/drugs/bulk', {
    method: 'POST',
    body: JSON.stringify({ drugs }),
  })

// Lot API
export const getLots = (drugId: string) =>
  apiFetch<DrugLot[]>(`/api/pharmacy/v1/drugs/${drugId}/lots`)

export const addLot = (drugId: string, data: DrugLotInput) =>
  apiFetch<DrugLot>(`/api/pharmacy/v1/drugs/${drugId}/lots`, { method: 'POST', body: JSON.stringify(data) })

export const deleteLot = (drugId: string, lotId: string) =>
  apiFetch<{ ok: boolean }>(`/api/pharmacy/v1/drugs/${drugId}/lots/${lotId}`, { method: 'DELETE' })
