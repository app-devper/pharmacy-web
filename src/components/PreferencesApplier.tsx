import { useEffect } from 'react'
import { usePreferences, resolveTheme } from '../hooks/usePreferences'

/**
 * Renders nothing — just syncs the user's preferences onto `<html>` as
 * `data-theme` and `data-font` attributes. Global CSS rules in index.css
 * pick these up to theme the app and scale the base font size.
 *
 * Auto theme also re-applies when the OS color scheme flips (e.g. at sunset).
 */
export default function PreferencesApplier() {
  const { prefs } = usePreferences()

  useEffect(() => {
    const root = document.documentElement
    const resolved = resolveTheme(prefs.theme)
    root.setAttribute('data-theme', resolved)
    root.setAttribute('data-font', prefs.fontSize)
    root.style.colorScheme = resolved   // inform browser (native form widgets follow)

    // Track OS-level changes when the user chose "auto"
    if (prefs.theme !== 'auto') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = (e: MediaQueryListEvent) => {
      const t = e.matches ? 'dark' : 'light'
      root.setAttribute('data-theme', t)
      root.style.colorScheme = t
    }
    mq.addEventListener('change', listener)
    return () => mq.removeEventListener('change', listener)
  }, [prefs.theme, prefs.fontSize])

  return null
}
