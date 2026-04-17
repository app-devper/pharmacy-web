import type { Customer } from '../../types/customer'

interface Props {
  customers: Customer[]
  onSelect: (c: Customer) => void
  onEdit?:  (c: Customer) => void
}

export default function CustomerTable({ customers, onSelect, onEdit }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">ชื่อ</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">เบอร์โทร</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">โรคประจำตัว / แพ้ยา</th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">ยอดซื้อรวม</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">มาล่าสุด</th>
            <th className="py-3 px-4 w-10" />
          </tr>
        </thead>
        <tbody>
          {customers.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-12 text-center text-gray-400 text-sm">ไม่พบลูกค้า</td>
            </tr>
          ) : customers.map(c => (
            <tr
              key={c.id}
              className="border-b border-gray-50 hover:bg-blue-50 cursor-pointer transition-colors group"
              onClick={() => onSelect(c)}
            >
              <td className="py-3 px-4 font-medium text-gray-800">{c.name}</td>
              <td className="py-3 px-4 text-gray-500">{c.phone || '—'}</td>
              <td className="py-3 px-4 text-xs max-w-[200px] truncate">
                {c.disease && c.disease !== '-'
                  ? <span className="text-amber-600">{c.disease}</span>
                  : <span className="text-gray-300">—</span>
                }
              </td>
              <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                ฿{c.total_spent.toLocaleString()}
              </td>
              <td className="py-3 px-4 text-gray-400 text-xs">
                {c.last_visit
                  ? new Date(c.last_visit).toLocaleDateString('th-TH')
                  : '—'}
              </td>
              <td className="py-3 px-4 text-right">
                <button
                  onClick={e => { e.stopPropagation(); onEdit(c) }}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-500 transition-all px-1 text-base"
                  title="แก้ไข"
                >
                  ✏️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
