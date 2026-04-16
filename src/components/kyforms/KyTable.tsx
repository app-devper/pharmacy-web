interface Column {
  key: string
  label: string
  align?: 'left' | 'right' | 'center'
  render?: (row: any) => React.ReactNode
}

interface Props {
  columns: Column[]
  rows: any[]
  footerRow?: Record<string, string | number>
}

export default function KyTable({ columns, rows, footerRow }: Props) {
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
                  {c.render ? c.render(row) : (row[c.key] ?? '—')}
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
