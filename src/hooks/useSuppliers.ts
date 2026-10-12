import { getSuppliers } from '../api/suppliers'
import { cachedList } from './cachedList'

const useSupplierList = cachedList(getSuppliers)

export function useSuppliers() {
  const { items: suppliers, loading, reload } = useSupplierList()
  return { suppliers, loading, reload }
}
