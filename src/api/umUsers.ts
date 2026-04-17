import type { UmUser, CreateUserInput, UpdateUserInput } from '../types/umUser'

const UM_API = import.meta.env.VITE_UM_API_URL || 'http://localhost:8585'

async function umFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${UM_API}${path}`, { ...options, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(body.message || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const listUsers = () =>
  umFetch<UmUser[]>('/api/um/v1/user')

export const getUser = (id: string) =>
  umFetch<UmUser>(`/api/um/v1/user/${id}`)

export const createUser = (data: CreateUserInput) =>
  umFetch<UmUser>('/api/um/v1/user', { method: 'POST', body: JSON.stringify(data) })

export const updateUser = (id: string, data: UpdateUserInput) =>
  umFetch<UmUser>(`/api/um/v1/user/${id}`, { method: 'PUT', body: JSON.stringify(data) })

export const deleteUser = (id: string) =>
  umFetch<UmUser>(`/api/um/v1/user/${id}`, { method: 'DELETE' })

export const setUserRole = (id: string, role: string) =>
  umFetch<UmUser>(`/api/um/v1/user/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) })

export const setUserStatus = (id: string, status: string) =>
  umFetch<UmUser>(`/api/um/v1/user/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })

export const setUserPassword = (id: string, password: string) =>
  umFetch<void>(`/api/um/v1/user/${id}/set-password`, { method: 'PATCH', body: JSON.stringify({ password }) })

export const updateMyInfo = (data: UpdateUserInput) =>
  umFetch<UmUser>('/api/um/v1/user/info', { method: 'PUT', body: JSON.stringify(data) })

export const changeMyPassword = (oldPassword: string, newPassword: string) =>
  umFetch<void>('/api/um/v1/user/change-password', { method: 'PUT', body: JSON.stringify({ oldPassword, newPassword }) })
