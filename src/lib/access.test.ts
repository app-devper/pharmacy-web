import { describe, expect, it } from 'vitest'
import { can, canOpen, PAGE_CAPABILITY, type Capability, type Page } from './access'

// The shared role policy (KMP ADR-0004) as a table: the lowest role that may
// do each thing, matching pharmacy-api's routes/permissions_test.go.
const lowest: Record<Capability, 'USER' | 'MANAGER' | 'ADMIN'> = {
  sell: 'USER',
  count_stock: 'MANAGER', adjust_stock: 'MANAGER', manage_expiry: 'MANAGER', receive_goods: 'MANAGER',
  manage_suppliers: 'MANAGER', edit_customers: 'MANAGER', print_labels: 'MANAGER', reorder: 'MANAGER',
  view_report: 'MANAGER',
  view_financial_report: 'ADMIN', edit_drug: 'ADMIN', export_stock: 'ADMIN', void_bill: 'ADMIN',
  resolve_pending_sale: 'ADMIN', manage_ky: 'ADMIN', manage_users: 'ADMIN', edit_settings: 'ADMIN',
}
const roles = ['USER', 'MANAGER', 'ADMIN', 'SUPER'] as const

describe('access policy', () => {
  it.each(Object.entries(lowest))('%s needs %s or higher', (capability, min) => {
    for (const role of roles) {
      expect(can(role, capability as Capability)).toBe(roles.indexOf(role) >= roles.indexOf(min as typeof roles[number]))
    }
  })

  it('lets unknown or missing roles do nothing', () => {
    for (const capability of Object.keys(lowest) as Capability[]) {
      expect(can(undefined, capability)).toBe(false)
      expect(can('GUEST', capability)).toBe(false)
    }
  })

  it('gates every page by one capability', () => {
    for (const page of Object.keys(PAGE_CAPABILITY) as Page[]) {
      expect(canOpen('SUPER', page)).toBe(true)
      expect(canOpen(undefined, page)).toBe(false)
    }
    expect(canOpen('MANAGER', '/report')).toBe(true)
    expect(canOpen('MANAGER', '/profit')).toBe(false)
    expect(canOpen('USER', '/ky9')).toBe(false)
  })
})
