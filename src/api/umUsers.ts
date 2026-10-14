import { umFetch } from './client'
import type { UmUser, CreateUserInput, UpdateUserInput, UmUserRules } from '../types/umUser'

export const listUsers = () =>
  umFetch<UmUser[]>('/api/um/v1/user')

/** What the signed-in user may do beyond individual users (um-api ADR-0006). */
export const getUserRules = () =>
  umFetch<UmUserRules>('/api/um/v1/user/rules')

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
