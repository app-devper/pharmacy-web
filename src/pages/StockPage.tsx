import { useState, useEffect } from 'react'
import type { Drug } from '../types/drug'
import { DRUG_TYPES } from '../types/drug'
import { getDrugs } from '../api/drugs'
import { useToast } from '../hooks/useToast'
import StockMetrics from '../components/stock/StockMetrics'
import DrugTable from '../components/stock/DrugTable'
import AddDrugModal from '../components/stock/AddDrugModal'
import ImportDrugsModal from '../components/stock/ImportDrugsModal'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import { exportStockXlsx } from '../utils/exportXlsx'
import { useIsAdmin } from '../hooks/useIsAdmin'

export default function StockPage() {
  const isAdmin = useIsAdmin()
  const [drugs, setDrugs] = useState<Drug[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const showToast = useToast()

  const load = async () => {
    setLoading(true)
    try { setDrugs(await getDrugs()) }
    catch (e: unknown) { showToast((e as Error).message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const q = search.toLowerCase()
  const filtered = drugs.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(q)
      || (d.generic_name ?? '').toLowerCase().includes(q)
      || (d.barcode ?? '').toLowerCase().includes(q)
    const matchType = !typeFilter || d.type === typeFilter
    return matchSearch && matchType
  })

  return (
    <div className="p-6">
      <StockMetrics drugs={drugs} />
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <input
            type="text"
            placeholder="ค้นหายา..."
            value={search}
            onChange={e => setSearch(e.target.value)}
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
          {isAdmin && (
            <>
              <Button variant="secondary" onClick={() => exportStockXlsx(drugs)}
                className="border-green-300 text-green-700 hover:bg-green-50">
                Excel
              </Button>
              <Button variant="secondary" onClick={() => setShowImport(true)}
                className="border-purple-300 text-purple-700 hover:bg-purple-50">
                นำเข้า Excel
              </Button>
              <Button onClick={() => setShowAdd(true)}>+ เพิ่มยา</Button>
            </>
          )}
        </div>
        {loading ? <Spinner /> : <DrugTable drugs={filtered} onReload={load} />}
      </div>
      {showAdd && <AddDrugModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />}
      {showImport && (
        <ImportDrugsModal
          onClose={() => setShowImport(false)}
          onImported={() => { load() }}
        />
      )}
    </div>
  )
}
