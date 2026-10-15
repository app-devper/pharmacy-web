export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  message: string
  type: ToastType
  visible: boolean
}

/** How long a toast stays up. */
export const TOAST_MS = 3000

interface Timers {
  setTimeout: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>
  clearTimeout: (id: ReturnType<typeof setTimeout>) => void
}

/**
 * The one toast on screen. Showing a toast restarts the hide timer, so a
 * toast shown soon after another stays up its full time instead of being
 * hidden by the earlier toast's timer.
 */
export function createToaster(render: (toast: Toast) => void, timers: Timers = globalThis) {
  let hideTimer: ReturnType<typeof setTimeout> | null = null
  let current: Toast = { message: '', type: 'success', visible: false }

  const set = (next: Toast) => {
    current = next
    render(next)
  }

  return {
    show(message: string, type: ToastType = 'success') {
      if (hideTimer !== null) timers.clearTimeout(hideTimer)
      set({ message, type, visible: true })
      hideTimer = timers.setTimeout(() => {
        hideTimer = null
        set({ ...current, visible: false })
      }, TOAST_MS)
    },
  }
}
