import { useState, useMemo, useRef, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
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

// Column count keyed off the scroll container's actual width (not viewport).
// Matches the prior Tailwind breakpoints closely: 2 / 3 / 4 cols as the
// available space grows, but responds to cart open/close without re-rendering.
function colsForWidth(w: number): number {
  if (w < 500)  return 2
  if (w < 900)  return 3
  return 4
}

export default function DrugGrid({ drugs, loading, onAdd, scannerActive, highlightedId }: Props) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [cols, setCols] = useState(3)

  const scrollRef = useRef<HTMLDivElement>(null)

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

  // Track container width to pick a column count that stays in sync with
  // layout changes (cart drawer toggles, window resize, sidebar collapse).
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const update = (w: number) => {
      const next = colsForWidth(w)
      setCols(prev => (prev === next ? prev : next))
    }
    update(el.clientWidth)
    const ro = new ResizeObserver(entries => update(entries[0].contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const rowCount = Math.ceil(filtered.length / cols)

  // Virtualize rows of cards. Each virtual row lays out `cols` DrugCard
  // instances via CSS grid; only rows within the viewport (+ overscan) are
  // actually rendered. Handles thousands of drugs without lag.
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 132,  // DrugCard ~120-140px depending on name wrap + alt badge
    overscan: 3,
  })

  if (loading) return <div className="flex-1"><Spinner /></div>

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex gap-2 p-3 border-b border-gray-100 bg-white shrink-0">
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
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-8 text-sm">ไม่พบรายการ</div>
        ) : (
          <div
            className="relative w-full"
            style={{ height: rowVirtualizer.getTotalSize() }}
          >
            {rowVirtualizer.getVirtualItems().map(vRow => {
              const startIdx = vRow.index * cols
              return (
                <div
                  key={vRow.index}
                  data-index={vRow.index}
                  ref={rowVirtualizer.measureElement}
                  className="absolute top-0 left-0 right-0 grid gap-2 px-3 py-1"
                  style={{
                    transform: `translateY(${vRow.start}px)`,
                    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                  }}
                >
                  {Array.from({ length: cols }).map((_, ci) => {
                    const drug = filtered[startIdx + ci]
                    if (!drug) return <div key={ci} />
                    return (
                      <DrugCard
                        key={drug.id}
                        drug={drug}
                        onAdd={onAdd}
                        highlighted={drug.id === highlightedId}
                      />
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
