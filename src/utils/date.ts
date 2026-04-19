/**
 * Date helpers pinned to a configurable timezone (default Asia/Bangkok) so
 * "today" / "this month" align with the pharmacy's local day regardless of the
 * browser's own timezone.
 *
 * The active timezone is set from the tenant's Settings document at app boot
 * (see SettingsContext). Components that need a Bangkok-style YMD string should
 * call these helpers instead of `new Date().toISOString()` — the latter is
 * always UTC and produces off-by-one-day bugs in the early-morning hours.
 *
 * We intentionally use `en-CA` formatting because it produces ISO-style
 * `YYYY-MM-DD` output, which matches what the backend expects and avoids any
 * locale-specific month/day reordering.
 */

const DEFAULT_TZ = 'Asia/Bangkok'

let currentTZ = DEFAULT_TZ
let ymdFmt = makeFmt(currentTZ)

function makeFmt(tz: string): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    // Unknown IANA name (stale config) → silently fall back.
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: DEFAULT_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }
}

/**
 * Update the active timezone used by the helpers below. Called once on
 * Settings load. Empty / invalid values fall back to the default.
 */
export function setAppTimezone(tz: string | undefined | null): void {
  const next = tz && tz.trim() ? tz.trim() : DEFAULT_TZ
  if (next === currentTZ) return
  currentTZ = next
  ymdFmt = makeFmt(next)
}

/** Current active timezone name (mainly for debugging / display). */
export function getAppTimezone(): string {
  return currentTZ
}

/** `YYYY-MM-DD` for the given instant (or now) in the active timezone. */
export function todayBangkok(d: Date = new Date()): string {
  return ymdFmt.format(d)
}

/** `YYYY-MM` for the given instant (or now) in the active timezone. */
export function monthBangkok(d: Date = new Date()): string {
  return todayBangkok(d).slice(0, 7)
}

/** `YYYY-MM-DD` for N days before the given instant, in the active timezone. */
export function daysAgoBangkokStr(days: number, d: Date = new Date()): string {
  const shifted = new Date(d.getTime() - days * 24 * 60 * 60 * 1000)
  return todayBangkok(shifted)
}

/**
 * Range covering the previous calendar month in the active timezone.
 * Returns `[fromYMD, toYMD]` inclusive — suitable for the backend's
 * `from` / `to` query params.
 */
export function lastMonthRangeBangkok(d: Date = new Date()): [string, string] {
  const todayStr = todayBangkok(d)
  const [y, m] = todayStr.split('-').map(Number)
  const prevYear = m === 1 ? y - 1 : y
  const prevMonth = m === 1 ? 12 : m - 1
  const lastDay = new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate()
  const mm = String(prevMonth).padStart(2, '0')
  return [`${prevYear}-${mm}-01`, `${prevYear}-${mm}-${String(lastDay).padStart(2, '0')}`]
}
