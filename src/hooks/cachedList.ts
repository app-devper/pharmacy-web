import { useCallback, useEffect, useState } from 'react'

/**
 * A list fetched once per session and shared by every page that shows it
 * (customers, suppliers). `reload` fetches it again for everyone who mounts
 * next; the caller that asked sees the new list right away.
 */
export function cachedList<T>(fetchAll: () => Promise<T[]>) {
  let cache: T[] = []
  return function useCachedList() {
    const [items, setItems] = useState<T[]>(cache)
    const [loading, setLoading] = useState(cache.length === 0)

    const load = useCallback(async () => {
      setLoading(true)
      try {
        cache = await fetchAll()
        setItems(cache)
      } finally {
        setLoading(false)
      }
    }, [])

    useEffect(() => {
      if (cache.length === 0) load()
    }, [load])

    const reload = useCallback(() => {
      cache = []
      load()
    }, [load])

    return { items, loading, reload }
  }
}
