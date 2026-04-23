import { apiFetch } from './client'
import { Customer, CustomerInput } from '../types/customer'
import type { Sale } from '../types/sale'

export const getCustomers = () => apiFetch<Customer[]>('/api/pharmacy/v1/customers')

export const addCustomer = (data: CustomerInput) =>
  apiFetch<Customer>('/api/pharmacy/v1/customers', { method: 'POST', body: JSON.stringify(data) })

export const updateCustomer = (id: string, data: CustomerInput) =>
  apiFetch<Customer>(`/api/pharmacy/v1/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) })

export const getCustomerSales = (id: string) =>
  apiFetch<Sale[]>(`/api/pharmacy/v1/customers/${id}/sales`)
