import { useEffect, useSyncExternalStore } from 'react'
import { getCustomers } from '../api/customers'
import { getSuppliers } from '../api/suppliers'
import { session } from '../api/client'
import { referenceList, type ReferenceList, type ReferenceListState } from '../lib/referenceList'
import type { Customer } from '../types/customer'
import type { Supplier } from '../types/supplier'

/** The shop's customers, shared by the customer page and the sale's picker. */
export const customerList = referenceList<Customer>(getCustomers)
/** The shop's suppliers, shared by the supplier page and the goods-receipt form. */
export const supplierList = referenceList<Supplier>(() => getSuppliers())

// A list belongs to the user who fetched it: another user signing in on
// this tab, or signing out, starts without it.
let listsBelongTo: string | null | undefined
session.subscribe((user) => {
  const id = user?.id ?? null
  if (id === listsBelongTo) return
  listsBelongTo = id
  customerList.forget()
  supplierList.forget()
})

/**
 * Reads a reference list, fetching it the first time any screen asks.
 * Screens remount when the user changes (SessionScoped), so a forgotten list
 * is fetched again by whoever shows it next.
 */
export function useReferenceList<T>(list: ReferenceList<T>): ReferenceListState<T> {
  useEffect(() => {
    list.ensure()
  }, [list])
  return useSyncExternalStore(list.subscribe, list.get)
}
