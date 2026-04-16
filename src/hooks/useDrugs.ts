import { useState, useEffect } from 'react'
import type { Drug } from '../types/drug'
import { getDrugs } from '../api/drugs'

let cachedDrugs: Drug[] = []

export function useDrugs() {
  const [drugs, setDrugs] = useState<Drug[]>(cachedDrugs)
  const [loading, setLoading] = useState(cachedDrugs.length === 0)

  const load = async () => {
    setLoading(true)
    try {
      const data = await getDrugs()
      cachedDrugs = data
      setDrugs(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (cachedDrugs.length === 0) load()
  }, [])

  const reload = () => {
    cachedDrugs = []
    load()
  }

  return { drugs, loading, reload }
}
