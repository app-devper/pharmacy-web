import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createToaster, TOAST_MS, type Toast } from './toast'

describe('createToaster', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('hides a toast after its time', () => {
    let shown: Toast | null = null
    const toaster = createToaster(t => { shown = t })
    toaster.show('บันทึกแล้ว')
    expect(shown).toMatchObject({ message: 'บันทึกแล้ว', visible: true })
    vi.advanceTimersByTime(TOAST_MS)
    expect(shown).toMatchObject({ message: 'บันทึกแล้ว', visible: false })
  })

  it('a second toast stays up its full time, not until the first one\'s timer', () => {
    let shown: Toast | null = null
    const toaster = createToaster(t => { shown = t })
    toaster.show('first')
    vi.advanceTimersByTime(TOAST_MS - 500)
    toaster.show('second', 'error')
    vi.advanceTimersByTime(600)
    expect(shown).toMatchObject({ message: 'second', type: 'error', visible: true })
    vi.advanceTimersByTime(TOAST_MS)
    expect(shown).toMatchObject({ message: 'second', visible: false })
  })
})
