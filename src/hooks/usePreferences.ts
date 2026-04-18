import { useEffect, useState, useCallback } from 'react'

/**
 * Per-browser UI preferences backed by localStorage.
 *
 * Kept deliberately simple: theme + font size. Each call site that wants to
 * change a preference uses `setTheme` / `setFontSize`; this hook broadcasts
 * changes via a `storage`-like custom event so every other mounted instance
 * (e.g. the Apply side-effect in PreferencesApplier and the form in
 * ProfilePage) stays in sync without requiring a Context wrapper.
 */

export type Theme = 'light' | 'dark' | 'auto'
export type FontSize = 'small' | 'normal' | 'large' | 'xl'

const STORAGE_KEY = 'pharmacy:prefs'
const CHANGE_EVENT = 'pharmacy:prefs-changed'

export interface Preferences {
  theme: Theme
  fontSize: FontSize
}

const defaults: Preferences = {
  theme: 'light',
  fontSize: 'normal',
}

function read(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as Partial<Preferences>
    return {
      theme:    parsed.theme    ?? defaults.theme,
      fontSize: parsed.fontSize ?? defaults.fontSize,
    }
  } catch {
    return defaults
  }
}

function write(prefs: Preferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    /* quota / private mode — ignore, current session still works */
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: prefs }))
}

export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(() => read())

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<Preferences>).detail
      if (detail) setPrefs(detail)
    }
    window.addEventListener(CHANGE_EVENT, handler)
    // Also listen to cross-tab updates
    const storageHandler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setPrefs(read())
    }
    window.addEventListener('storage', storageHandler)
    return () => {
      window.removeEventListener(CHANGE_EVENT, handler)
      window.removeEventListener('storage', storageHandler)
    }
  }, [])

  const setTheme    = useCallback((theme: Theme)       => write({ ...read(), theme }), [])
  const setFontSize = useCallback((fontSize: FontSize) => write({ ...read(), fontSize }), [])
  const reset       = useCallback(()                   => write(defaults), [])

  return { prefs, setTheme, setFontSize, reset }
}

/** Resolve "auto" into the concrete light/dark value based on system preference. */
export function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'auto') {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}
