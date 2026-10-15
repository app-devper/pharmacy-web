import { supplierList, useReferenceList } from './referenceLists'

export function useSuppliers() {
  const { items: suppliers, loading, error } = useReferenceList(supplierList)
  return { suppliers, loading, error, reload: supplierList.refresh }
}
