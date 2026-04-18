import { useState, useMemo } from 'react'
import { Drug, AltUnit, DRUG_TYPES } from '../../types/drug'
import DrugCard from './DrugCard'
import Spinner from '../ui/Spinner'

interface Props {
  drugs: Drug[]
  loading: boolean
  onAdd: (drug: Drug, altUnit?: AltUnit | null) => void
  scannerActive?: boolean
  highlightedId?: string | null
}

export default function DrugGrid({ drugs, loading, onAdd, scannerActive, highlightedId }: Props) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return drugs.filter(d => {
      const matchSearch = d.name.toLowerCase().includes(q)
        || (d.generic_name ?? '').toLowerCase().includes(q)
        || (d.barcode ?? '').toLowerCase().includes(q)
      const matchType = !typeFilter || d.type === typeFilter
      return matchSearch && matchType
    })
  }, [drugs, search, typeFilter])

  if (loading) return <div className="flex-1"><Spinner /></div>

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex gap-2 p-3 border-b border-gray-100 bg-white">
        <input
          type="text"
          placeholder="ค้นหายา... (F1)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          data-shortcut="search"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
        />
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
        >
          <option value="">ทุกประเภท</option>
          {DRUG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {scannerActive && (
          <div className="flex items-center gap-1.5 px-2.5 border border-green-200 bg-green-50 rounded-lg select-none" title="บาร์โค้ดสแกนเนอร์พร้อมใช้งาน">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-green-700 font-medium whitespace-nowrap">สแกน</span>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 content-start">
        {filtered.map(d => (
          <DrugCard key={d.id} drug={d} onAdd={onAdd} highlighted={d.id === highlightedId} />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-2 text-center text-gray-400 py-8 text-sm">ไม่พบรายการ</div>
        )}
      </div>
    </div>
  )
}
