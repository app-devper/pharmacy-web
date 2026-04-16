import { Drug, getDrugSellPrice } from '../../types/drug'
import { TypeBadge, KyBadges } from '../ui/Badge'

interface Props {
  drug: Drug
  onAdd: (drug: Drug) => void
}

export default function DrugCard({ drug, onAdd }: Props) {
  const oos = drug.stock === 0
  const price = getDrugSellPrice(drug)
  return (
    <button
      onClick={() => !oos && onAdd(drug)}
      disabled={oos}
      className={`bg-white rounded-xl border p-3 text-left transition-all ${
        oos
          ? 'opacity-50 cursor-not-allowed border-gray-100'
          : 'hover:shadow-md hover:border-blue-300 active:scale-95 border-gray-200'
      }`}
    >
      <div className="flex justify-between items-start gap-2 mb-0.5">
        <span className="text-sm font-medium text-gray-800 leading-tight">{drug.name}</span>
        {oos && <span className="text-xs text-red-500 shrink-0">หมด</span>}
      </div>
      {drug.generic_name && (
        <span className="text-xs text-gray-400 block mb-1 leading-tight">{drug.generic_name}{drug.strength ? ` ${drug.strength}` : ''}</span>
      )}
      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
        <TypeBadge type={drug.type} />
        <KyBadges types={drug.report_types ?? []} />
      </div>
      <div className="flex justify-between items-end mt-1">
        <span className="text-blue-600 font-bold text-base">฿{price.toLocaleString()}</span>
        <span className="text-xs text-gray-400">คงเหลือ {drug.stock} {drug.unit}</span>
      </div>
    </button>
  )
}
