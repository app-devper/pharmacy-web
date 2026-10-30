import { describe, expect, it } from 'vitest'
import { createLatest, errorText } from './latest'

function deferred<T>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

describe('latest', () => {
  it('applies the answer of the only read', async () => {
    const latest = createLatest()
    expect(await latest.run(Promise.resolve(3))).toEqual({ status: 'ok', value: 3 })
  })

  it('a slow answer to an older read never overwrites the newer one', async () => {
    const latest = createLatest()
    const old = deferred<string>()
    const fresh = deferred<string>()
    const first = latest.run(old.promise)
    const second = latest.run(fresh.promise)
    fresh.resolve('page 2')
    old.resolve('page 1')
    expect(await second).toEqual({ status: 'ok', value: 'page 2' })
    expect(await first).toEqual({ status: 'stale' })
  })

  it('an older failure is stale too, so it cannot flash an error over newer data', async () => {
    const latest = createLatest()
    const old = deferred<number>()
    const first = latest.run(old.promise)
    await latest.run(Promise.resolve(1))
    old.reject(new Error('timeout'))
    expect(await first).toEqual({ status: 'stale' })
  })

  it('reports the newest read failing', async () => {
    const latest = createLatest()
    const boom = new Error('boom')
    expect(await latest.run(Promise.reject(boom))).toEqual({ status: 'failed', error: boom })
  })

  it('cancel makes reads in flight stale (the reader went away)', async () => {
    const latest = createLatest()
    const pending = deferred<number>()
    const run = latest.run(pending.promise)
    latest.cancel()
    pending.resolve(1)
    expect(await run).toEqual({ status: 'stale' })
  })

  it('turns any failure into a message', () => {
    expect(errorText(new Error('stock ไม่พอ'))).toBe('stock ไม่พอ')
    expect(errorText('x')).toBe('x')
    expect(errorText(undefined)).toBe('โหลดข้อมูลไม่สำเร็จ')
  })
})
