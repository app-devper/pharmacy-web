import { apiFetch } from './client'
import type { Settings, SettingsInput } from '../types/setting'

export const getSettings = () => apiFetch<Settings>('/api/pharmacy/v1/settings')

export const updateSettings = (data: SettingsInput) =>
  apiFetch<Settings>('/api/pharmacy/v1/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
