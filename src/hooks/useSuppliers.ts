import { useState, useEffect } from 'react'
import type { Supplier } from '../types/supplier'
import { getSuppliers } from '../api/suppliers'

let cachedSuppliers: Supplier[] = []

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(cachedSuppliers)
  const [loading, setLoading] = useState(cachedSuppliers.length === 0)

  const load = async () => {
    setLoading(true)
    try {
      const data = await getSuppliers()
      cachedSuppliers = data
      setSuppliers(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (cachedSuppliers.length === 0) load()
  }, [])

  const reload = () => {
    cachedSuppliers = []
    load()
  }

  return { suppliers, loading, reload }
}
