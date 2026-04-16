import { Sale } from '../../types/sale'

interface Props {
  sales: Sale[]
}

export default function RecentBills({ sales }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">บิลล่าสุด</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-2 text-xs font-semibold text-gray-500">เลขที่บิล</th>
            <th className="text-left py-2 text-xs font-semibold text-gray-500">เวลา</th>
            <th className="text-right py-2 text-xs font-semibold text-gray-500">ยอด</th>
          </tr>
        </thead>
        <tbody>
          {sales.slice(0, 5).map(s => (
            <tr key={s.id} className="border-b border-gray-50">
              <td className="py-2 font-mono text-xs text-gray-700">{s.bill_no}</td>
              <td className="py-2 text-gray-500 text-xs">
                {new Date(s.sold_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
              </td>
              <td className="py-2 text-right font-semibold text-blue-600">฿{s.total.toLocaleString()}</td>
            </tr>
          ))}
          {sales.length === 0 && (
            <tr><td colSpan={3} className="py-4 text-center text-gray-400 text-xs">ยังไม่มีรายการ</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
