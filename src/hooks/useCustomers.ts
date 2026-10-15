import { customerList, useReferenceList } from './referenceLists'

export function useCustomers() {
  const { items: customers, loading, error } = useReferenceList(customerList)
  return { customers, loading, error, reload: customerList.refresh }
}
