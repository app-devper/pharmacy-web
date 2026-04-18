import { useState, useEffect } from 'react'
import type { Drug } from '../types/drug'
import { getDrugs } from '../api/drugs'

// Promise-based cache: deduplicates concurrent fetches and avoids stale overwrites
let drugCache: Drug[] | null = null
let drugPromise: Promise<Drug[]> | null = null

export function useDrugs() {
  const [drugs, setDrugs] = useState<Drug[]>(drugCache ?? [])
  const [loading, setLoading] = useState(drugCache === null)

  const load = async () => {
    if (drugCache) {
      setDrugs(drugCache)
      setLoading(false)
      return
    }
    // Reuse an in-flight request instead of firing a duplicate
    if (!drugPromise) {
      drugPromise = getDrugs().finally(() => { drugPromise = null })
    }
    setLoading(true)
    try {
      const data = await drugPromise
      drugCache = data
      setDrugs(data)
    } catch {
      // leave previous data in place; caller can retry
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (drugCache === null) load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const reload = () => {
    drugCache = null
    load()
  }

  return { drugs, loading, reload }
}
