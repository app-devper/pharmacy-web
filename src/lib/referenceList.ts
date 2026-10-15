/** What a reference list holds right now. */
export interface ReferenceListState<T> {
  items: T[]
  /** A fetch is in flight. */
  loading: boolean
  /** The last fetch failed; the items are the last good ones (or empty). */
  error: unknown | null
}

export interface ReferenceList<T> {
  /** The current state; the same object until something changes. */
  get(): ReferenceListState<T>
  /** Hears every change of state. */
  subscribe(listener: () => void): () => void
  /** Fetches the list unless it is already here or on its way. */
  ensure(): Promise<void>
  /** Fetches the list again for every reader, e.g. after an add, edit or delete. */
  refresh(): Promise<void>
  /** Drops the list, e.g. when the signed-in user changes, so it is fetched afresh. */
  forget(): void
}

const EMPTY = { items: [], loading: false, error: null }

/**
 * One shared copy of a list many screens read (customers, suppliers): the
 * list pages and the pickers in other screens all read it, every change
 * refreshes it for all of them, and a new session starts without it.
 */
export function referenceList<T>(fetchAll: () => Promise<T[]>): ReferenceList<T> {
  let state: ReferenceListState<T> = EMPTY
  let loaded = false
  let inFlight: Promise<void> | null = null
  let generation = 0
  const listeners = new Set<() => void>()

  const set = (next: Partial<ReferenceListState<T>>) => {
    state = { ...state, ...next }
    listeners.forEach((l) => l())
  }

  function fetchNow(): Promise<void> {
    const mine = ++generation
    set({ loading: true })
    const run = fetchAll().then(
      (items) => {
        if (mine !== generation) return
        loaded = true
        set({ items, loading: false, error: null })
      },
      (error: unknown) => {
        if (mine !== generation) return
        set({ loading: false, error })
      },
    )
    inFlight = run.finally(() => {
      if (mine === generation) inFlight = null
    })
    return inFlight
  }

  return {
    get: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    ensure() {
      if (loaded) return Promise.resolve()
      return inFlight ?? fetchNow()
    },
    refresh: fetchNow,
    forget() {
      generation++
      loaded = false
      inFlight = null
      state = EMPTY
      listeners.forEach((l) => l())
    },
  }
}
