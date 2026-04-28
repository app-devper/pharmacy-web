import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DRUG_TYPES } from '../types/drug'
import { useDrugs } from '../hooks/useDrugs'
import StockMetrics from '../components/stock/StockMetrics'
import DrugTable from '../components/stock/DrugTable'
import ImportDrugsModal from '../components/stock/ImportDrugsModal'
import ReorderSuggestionsModal from '../components/stock/ReorderSuggestionsModal'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import { exportStockXlsx } from '../utils/exportXlsx'
import { useIsAdmin } from '../hooks/useIsAdmin'

export default function StockPage() {
  const navigate = useNavigate()
  const isAdmin = useIsAdmin()
  // Shared drug cache (DrugsContext). Switching between Sell/Stock no longer refetches.
  const { drugs, loading, reload } = useDrugs()
  const [showImport, setShowImport] = useState(false)
  const [showReorder, setShowReorder] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const load = () => { reload() }

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

  return (
    <div className="p-6 flex flex-col h-full overflow-hidden">
      <div className="shrink-0">
        <StockMetrics drugs={drugs} />
      </div>
      <div className="bg-white rounded-xl border border-gray-100 flex-1 min-h-0 flex flex-col overflow-hidden mt-4">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 shrink-0">
          <input
            type="text"
            placeholder="ค้นหายา…"
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
              <Button variant="secondary" onClick={() => setShowReorder(true)}
                className="border-indigo-300 text-indigo-700 hover:bg-indigo-50">
                🔄 แนะนำสั่งซื้อ
              </Button>
              <Button onClick={() => navigate('/stock/new')}>+ เพิ่มยา</Button>
            </>
          )}
        </div>
        {!loading && (
          <div className="px-4 py-2 border-b border-gray-50 text-xs text-gray-500 shrink-0">
            {search || typeFilter
              ? <>พบ <span className="font-semibold text-gray-700">{filtered.length.toLocaleString()}</span> รายการ จากทั้งหมด {drugs.length.toLocaleString()}</>
              : <>ทั้งหมด <span className="font-semibold text-gray-700">{drugs.length.toLocaleString()}</span> รายการ</>
            }
          </div>
        )}
        {loading ? <Spinner /> : <DrugTable drugs={filtered} onReload={load} />}
      </div>
      {showImport && (
        <ImportDrugsModal
          onClose={() => setShowImport(false)}
          onImported={() => { load() }}
        />
      )}
      {showReorder && (
        <ReorderSuggestionsModal
          onClose={() => setShowReorder(false)}
        />
      )}
    </div>
  )
}
