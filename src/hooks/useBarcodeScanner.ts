import { useEffect, useRef } from 'react'

/**
 * useBarcodeScanner
 *
 * Listens for keyboard input from a USB/Bluetooth barcode scanner (HID mode).
 * Scanners behave like a keyboard that types characters extremely fast and
 * ends with an Enter key press.
 *
 * Strategy:
 *  - Accumulate printable keystrokes in a buffer
 *  - On Enter → fire onScan(buffer) if buffer.length >= MIN_LEN
 *  - Auto-flush buffer after TIMEOUT_MS of silence (handles scanners without Enter suffix)
 *  - Ignore keystrokes that originate from input / textarea / select elements
 *    so normal typing by the cashier is never intercepted
 */

const MIN_LEN     = 3    // minimum chars to be treated as a barcode
const TIMEOUT_MS  = 100  // ms of silence before auto-flush (scanner sends all chars in <50 ms)

export function useBarcodeScanner(onScan: (barcode: string) => void) {
  const bufferRef  = useRef('')
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Keep a stable ref to onScan so we don't need to re-register the listener
  // every time the parent re-renders with a new inline arrow function
  const onScanRef  = useRef(onScan)
  useEffect(() => { onScanRef.current = onScan }, [onScan])

  useEffect(() => {
    const flush = () => {
      const barcode = bufferRef.current.trim()
      bufferRef.current = ''
      if (barcode.length >= MIN_LEN) onScanRef.current(barcode)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip events fired while the user is focused inside a text field
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.key === 'Enter') {
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
        flush()
        return
      }

      // Only accumulate printable single characters
      if (e.key.length === 1) {
        bufferRef.current += e.key
        // Reset the auto-flush timer on every new character
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(flush, TIMEOUT_MS)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, []) // intentionally empty — relies on onScanRef
}
