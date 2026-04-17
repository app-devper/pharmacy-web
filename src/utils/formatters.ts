export function fmtDate(s: string | undefined | null): string {
  if (!s) return '—'
  return s.slice(0, 10)
}

// Thai locale date-only — "16 เม.ย. 2568"
export function fmtDateThai(s: string | undefined | null): string {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export function fmtDateTime(s: string | undefined | null): string {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function fmtMoney(n: number | undefined | null): string {
  if (n == null) return '—'
  return `฿${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Abbreviated chart axis formatter: ฿12k, ฿500
export function fmtK(v: number): string {
  return v >= 1000 ? `฿${(v / 1000).toFixed(0)}k` : `฿${v}`
}

const THAI_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

// Converts "YYYY-MM" to Thai short month name e.g. "เม.ย."
export function shortMonth(ym: string): string {
  const m = parseInt(ym.slice(5, 7), 10)
  return THAI_MONTHS[m - 1] ?? ym
}
