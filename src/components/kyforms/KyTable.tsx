import type { ReactNode } from 'react'

type RowWithID = { id?: string | number }

interface Column<T> {
  key: string
  label: string
  align?: 'left' | 'right' | 'center'
  render?: (row: T) => ReactNode
}

interface Props<T extends RowWithID> {
  columns: Column<T>[]
  rows: T[]
  footerRow?: Record<string, string | number>
}

function cellValue(row: unknown, key: string): ReactNode {
  const value = (row as Record<string, unknown>)[key]
  if (value == null) return '—'
  if (typeof value === 'string' || typeof value === 'number') return value
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value)
}

export default function KyTable<T extends RowWithID>({ columns, rows, footerRow }: Props<T>) {
  const align = (a?: string) =>
    a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left'

  return (
    <div className="overflow-x-auto bg-white rounded-xl border border-gray-100">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="py-2.5 px-3 text-gray-500 font-semibold text-left">#</th>
            {columns.map(c => (
              <th key={c.key} className={`py-2.5 px-3 text-gray-500 font-semibold ${align(c.align)}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id || i} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="py-2 px-3 text-gray-400">{i + 1}</td>
              {columns.map(c => (
                <td key={c.key} className={`py-2 px-3 text-gray-700 ${align(c.align)}`}>
                  {c.render ? c.render(row) : cellValue(row, c.key)}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length + 1} className="py-6 text-center text-gray-400">ไม่มีข้อมูล</td>
            </tr>
          )}
          {footerRow && (
            <tr className="border-t border-gray-200 bg-gray-50 font-semibold">
              <td className="py-2 px-3" />
              {columns.map(c => (
                <td key={c.key} className={`py-2 px-3 ${align(c.align)}`}>
                  {footerRow[c.key] ?? ''}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
