import { useState, useEffect } from 'react'
import type { Customer } from '../types/customer'
import { getCustomers } from '../api/customers'

let cachedCustomers: Customer[] = []

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>(cachedCustomers)
  const [loading, setLoading] = useState(cachedCustomers.length === 0)

  const load = async () => {
    setLoading(true)
    try {
      const data = await getCustomers()
      cachedCustomers = data
      setCustomers(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (cachedCustomers.length === 0) load()
  }, [])

  const reload = () => {
    cachedCustomers = []
    load()
  }

  return { customers, loading, reload }
}
