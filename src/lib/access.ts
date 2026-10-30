import { hasRole, type Role } from './roles'

/**
 * The access policy (KMP ADR-0004): what each role may do, named by what it
 * does rather than by rank. Routes, navigation and actions all ask `can`, so
 * they cannot drift apart. pharmacy-api enforces the same split per route
 * (routes/permissions_test.go); the UI only hides what the server would
 * refuse (ADR-0014).
 */
export type Capability =
  | 'sell'                  // sell, return, sales history, stock and movements, customers at the counter
  | 'count_stock'           // stock counts
  | 'adjust_stock'          // stock adjustments and lots
  | 'manage_expiry'         // expiring lots and write-off
  | 'receive_goods'         // goods receipt
  | 'manage_suppliers'
  | 'edit_customers'
  | 'print_labels'
  | 'reorder'               // reorder suggestions
  | 'view_report'           // the report page (managers see their part)
  | 'view_financial_report' // sales, profit and End-of-day figures
  | 'edit_drug'             // drug identity and prices, add or import drugs
  | 'export_stock'          // stock with cost as a spreadsheet
  | 'void_bill'             // void a whole bill
  | 'resolve_pending_sale'  // abandon or discard a pending sale
  | 'manage_ky'             // KY registers (ky9, reading, export)
  | 'manage_users'
  | 'edit_settings'

const MIN_ROLE: Record<Capability, Role> = {
  sell: 'USER',
  count_stock: 'MANAGER',
  adjust_stock: 'MANAGER',
  manage_expiry: 'MANAGER',
  receive_goods: 'MANAGER',
  manage_suppliers: 'MANAGER',
  edit_customers: 'MANAGER',
  print_labels: 'MANAGER',
  reorder: 'MANAGER',
  view_report: 'MANAGER',
  view_financial_report: 'ADMIN',
  edit_drug: 'ADMIN',
  export_stock: 'ADMIN',
  void_bill: 'ADMIN',
  resolve_pending_sale: 'ADMIN',
  manage_ky: 'ADMIN',
  manage_users: 'ADMIN',
  edit_settings: 'ADMIN',
}

/** Whether a user with `role` may do `capability`. Unknown or missing roles may do nothing. */
export function can(role: string | undefined, capability: Capability): boolean {
  return hasRole(role, MIN_ROLE[capability])
}

/** What each page needs; the route guard and the navigation read this one table. */
export const PAGE_CAPABILITY = {
  '/sell': 'sell',
  '/sales': 'sell',
  '/stock': 'sell',
  '/stock-count': 'count_stock',
  '/labels': 'print_labels',
  '/stock/new': 'edit_drug',
  '/stock/:id/edit': 'edit_drug',
  '/imports': 'receive_goods',
  '/suppliers': 'manage_suppliers',
  '/customers': 'sell',
  '/report': 'view_report',
  '/profit': 'view_financial_report',
  '/expiry': 'manage_expiry',
  '/movements': 'sell',
  '/offline-sync': 'sell',
  '/ky9': 'manage_ky',
  '/ky10': 'manage_ky',
  '/ky11': 'manage_ky',
  '/ky12': 'manage_ky',
  '/users': 'manage_users',
  '/profile': 'sell',
  '/settings': 'edit_settings',
  '/help': 'sell',
} as const satisfies Record<string, Capability>

export type Page = keyof typeof PAGE_CAPABILITY

/** Whether a user with `role` may open `page`. */
export function canOpen(role: string | undefined, page: Page): boolean {
  return can(role, PAGE_CAPABILITY[page])
}
