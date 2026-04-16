interface Props {
  options: number[]
  value: number
  onChange: (d: number) => void
}

export default function DayPicker({ options, value, onChange }: Props) {
  return (
    <div className="flex gap-1">
      {options.map(d => (
        <button
          key={d}
          onClick={() => onChange(d)}
          className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
            value === d
              ? 'bg-blue-600 text-white border-blue-600'
              : 'border-gray-200 text-gray-500 hover:bg-gray-50'
          }`}
        >
          {d} วัน
        </button>
      ))}
    </div>
  )
}
