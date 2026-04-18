import { apiFetch } from './client'
import type { Settings, SettingsInput } from '../types/setting'

export const getSettings = () => apiFetch<Settings>('/api/settings')

export const updateSettings = (data: SettingsInput) =>
  apiFetch<Settings>('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
