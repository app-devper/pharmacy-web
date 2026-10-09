import { getCustomers } from '../api/customers'
import { cachedList } from './cachedList'

const useCustomerList = cachedList(getCustomers)

export function useCustomers() {
  const { items: customers, loading, reload } = useCustomerList()
  return { customers, loading, reload }
}
