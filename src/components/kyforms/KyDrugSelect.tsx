import { useDrugs } from '../../hooks/useDrugs'

interface Props {
  kyType: string          // 'ky9' | 'ky10' | 'ky11' | 'ky12'
  value: string
  onChange: (name: string, regNo: string, unit: string) => void
  placeholder?: string
}

export default function KyDrugSelect({ kyType, value, onChange, placeholder = 'พิมพ์ชื่อยา...' }: Props) {
  const { drugs } = useDrugs()

  // drugs linked to this KY form
  const linked = drugs.filter(d => (d.report_types ?? []).includes(kyType))

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value, '', '')}
        placeholder={placeholder}
        list={`ky-drug-list-${kyType}`}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
      />
      <datalist id={`ky-drug-list-${kyType}`}>
        {linked.map(d => (
          <option key={d.id} value={d.name} />
        ))}
      </datalist>
      {linked.length > 0 && value === '' && (
        <div className="mt-1 text-xs text-gray-400">
          ยาที่ผูก {kyType.toUpperCase()}: {linked.map(d => d.name).join(', ')}
        </div>
      )}
    </div>
  )
}
