import { useCallback, useEffect, useState } from 'react'
import { createLatest, errorText } from '../lib/latest'
import { useDrugs } from './useDrugs'
import { useToast } from './useToast'

interface Options {
  /** Read again whenever stock changes (a sale, void, return, receipt, count, adjustment or sync). */
  followStock?: boolean
  /** Keep failures off the toast (the caller shows `error` itself, or the read is decorative). */
  quiet?: boolean
}

interface ServerRead<T> {
  data: T
  loading: boolean
  /** The last failure's message, cleared by the next success. */
  error: string | null
  reload: () => Promise<void>
  /** Local edit of the data shown (e.g. after a delete), until the next read. */
  setData: (update: T | ((current: T) => T)) => void
}

/**
 * A server read that depends on its inputs. Pass `read` from `useCallback`
 * with those inputs as deps: the read runs again when they change, only the
 * newest answer is applied, and failures become `error` (and a toast).
 */
export function useServerRead<T>(read: () => Promise<T>, initial: T, { followStock = false, quiet = false }: Options = {}): ServerRead<T> {
  const showToast = useToast()
  const { stockVersion } = useDrugs()
  const [latest] = useState(createLatest)
  const [state, setState] = useState({ data: initial, loading: true, error: null as string | null })

  const reload = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }))
    const outcome = await latest.run(read())
    if (outcome.status === 'stale') return
    if (outcome.status === 'ok') {
      setState({ data: outcome.value, loading: false, error: null })
      return
    }
    const message = errorText(outcome.error)
    setState((s) => ({ ...s, loading: false, error: message }))
    if (!quiet) showToast(message, 'error')
  }, [read, latest, quiet, showToast])

  const stock = followStock ? stockVersion : 0
  useEffect(() => {
    void reload()
  }, [reload, stock])

  useEffect(() => () => latest.cancel(), [latest])

  const setData = useCallback((update: T | ((current: T) => T)) => {
    setState((s) => ({ ...s, data: typeof update === 'function' ? (update as (c: T) => T)(s.data) : update }))
  }, [])

  return { ...state, reload, setData }
}
