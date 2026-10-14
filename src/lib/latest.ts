/** What became of a tracked read. */
export type Outcome<T> =
  | { status: 'ok'; value: T }
  | { status: 'failed'; error: unknown }
  /** A newer read started (or the reader went away) before this one answered. */
  | { status: 'stale' }

/**
 * Keeps only the newest of overlapping reads, so a slow answer to an old
 * filter can never overwrite the answer to the current one.
 */
export function createLatest() {
  let ticket = 0
  return {
    async run<T>(read: Promise<T>): Promise<Outcome<T>> {
      const mine = ++ticket
      try {
        const value = await read
        return mine === ticket ? { status: 'ok', value } : { status: 'stale' }
      } catch (error) {
        return mine === ticket ? { status: 'failed', error } : { status: 'stale' }
      }
    },
    /** Makes every read still in flight stale (e.g. on unmount). */
    cancel() {
      ticket++
    },
  }
}

/** The message to show for a failed read. */
export function errorText(e: unknown): string {
  if (e instanceof Error && e.message) return e.message
  return typeof e === 'string' && e ? e : 'โหลดข้อมูลไม่สำเร็จ'
}
