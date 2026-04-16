import { useEffect, useRef } from 'react'

interface Options {
  onClearCart: () => void
}

/**
 * useKeyboardShortcuts — POS keyboard shortcuts
 *
 * F1  : focus the drug search input  (data-shortcut="search")
 * F2  : focus the received amount input (data-shortcut="received")
 * Esc : clear the cart (only when focus is NOT inside a text field)
 *
 * Enter on the received input triggers checkout via onKeyDown on the input itself
 * (wired in Cart.tsx), not here, to avoid accidental checkouts.
 */
export function useKeyboardShortcuts({ onClearCart }: Options) {
  const onClearCartRef = useRef(onClearCart)
  useEffect(() => { onClearCartRef.current = onClearCart }, [onClearCart])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault()
        document.querySelector<HTMLInputElement>('[data-shortcut="search"]')?.focus()
        return
      }
      if (e.key === 'F2') {
        e.preventDefault()
        document.querySelector<HTMLInputElement>('[data-shortcut="received"]')?.focus()
        return
      }
      if (e.key === 'Escape') {
        const tag = (e.target as HTMLElement).tagName
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
          onClearCartRef.current()
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}
