import { describe, expect, it, vi } from 'vitest'
import { referenceList } from './referenceList'

function deferred<T>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

describe('referenceList', () => {
  it('fetches once however many screens ask', async () => {
    const fetchAll = vi.fn().mockResolvedValue(['a'])
    const list = referenceList(fetchAll)
    await Promise.all([list.ensure(), list.ensure()])
    await list.ensure()
    expect(fetchAll).toHaveBeenCalledTimes(1)
    expect(list.get().items).toEqual(['a'])
  })

  it('a refresh after a change reaches every reader', async () => {
    const fetchAll = vi.fn().mockResolvedValueOnce(['a']).mockResolvedValueOnce(['a', 'b'])
    const list = referenceList(fetchAll)
    const heard = vi.fn()
    list.subscribe(heard)
    await list.ensure()
    await list.refresh()
    expect(list.get().items).toEqual(['a', 'b'])
    expect(heard).toHaveBeenCalled()
  })

  it('forgetting drops the list so the next session fetches its own', async () => {
    const fetchAll = vi.fn().mockResolvedValueOnce(['user 1 customer']).mockResolvedValueOnce(['user 2 customer'])
    const list = referenceList(fetchAll)
    await list.ensure()
    list.forget()
    expect(list.get().items).toEqual([])
    await list.ensure()
    expect(list.get().items).toEqual(['user 2 customer'])
  })

  it('an answer that arrives after forget is dropped', async () => {
    const slow = deferred<string[]>()
    const list = referenceList(() => slow.promise)
    const pending = list.ensure()
    list.forget()
    slow.resolve(['previous user customer'])
    await pending
    expect(list.get().items).toEqual([])
  })

  it('a failed fetch keeps the last good items and can be retried', async () => {
    const fetchAll = vi.fn().mockResolvedValueOnce(['a']).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(['a', 'b'])
    const list = referenceList(fetchAll)
    await list.ensure()
    await list.refresh()
    expect(list.get()).toMatchObject({ items: ['a'], loading: false })
    expect((list.get().error as Error).message).toBe('offline')
    await list.refresh()
    expect(list.get()).toMatchObject({ items: ['a', 'b'], error: null })
  })
})
