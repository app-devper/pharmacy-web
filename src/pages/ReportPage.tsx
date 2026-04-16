import { useState, useEffect, useMemo } from 'react'
import type { ReportSummary, DailyData, MonthlyData } from '../types/report'
import type { Sale } from '../types/sale'
import { getSummary, getDaily, getMonthly } from '../api/report'
import { getSales } from '../api/sales'
import { useToast } from '../hooks/useToast'
import ReportMetrics from '../components/report/ReportMetrics'
import SalesBarChart from '../components/report/SalesBarChart'
import MonthlyChart from '../components/report/MonthlyChart'
import TopDrugsChart from '../components/report/TopDrugsChart'
import SlowDrugsTable from '../components/report/SlowDrugsTable'
import RecentBills from '../components/report/RecentBills'
import EodModal from '../components/report/EodModal'
import DayPicker from '../components/ui/DayPicker'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'

const DAY_OPTIONS = [7, 14, 30]

export default function ReportPage() {
  const [summary, setSummary]   = useState<ReportSummary | null>(null)
  const [daily, setDaily]       = useState<DailyData[]>([])
  const [monthly, setMonthly]   = useState<MonthlyData[]>([])
  const [sales, setSales]       = useState<Sale[]>([])
  const [loading, setLoading]   = useState(true)
  const [days, setDays]         = useState(7)
  const [showEod, setShowEod]   = useState(false)
  const showToast = useToast()

  // Reload daily chart when days selector changes
  useEffect(() => {
    let mounted = true
    getDaily(days)
      .then(d  => { if (mounted) setDaily(d) })
      .catch((e: unknown) => { if (mounted) showToast((e as Error).message, 'error') })
    return () => { mounted = false }
  }, [days, showToast])

  // Initial full load — getDaily is handled by the effect above
  useEffect(() => {
    setLoading(true)
    Promise.all([getSummary(), getMonthly(12), getSales({ limit: 5 })])
      .then(([s, m, sl]) => {
        setSummary(s)
        setMonthly(m)
        setSales(sl)
      })
      .catch((e: unknown) => showToast((e as Error).message, 'error'))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentMonthProfit = useMemo(() => {
    const thisMonth = new Date().toISOString().slice(0, 7)
    return monthly.find(m => m.month === thisMonth)?.profit
  }, [monthly])

  if (loading) return <Spinner />

  return (
    <div className="p-6">
      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowEod(true)}>ปิดรอบ</Button>
      </div>

      {summary && <ReportMetrics summary={summary} monthProfit={currentMonthProfit} />}

      <div className="flex items-center gap-2 mb-3 justify-end">
        <DayPicker options={DAY_OPTIONS} value={days} onChange={setDays} />
      </div>
      <SalesBarChart data={daily} days={days} />

      {/* MonthlyChart receives already-fetched data — no second HTTP call */}
      <MonthlyChart data={monthly} />

      <div className="grid grid-cols-2 gap-4 mb-4">
        <TopDrugsChart />
        <SlowDrugsTable />
      </div>

      <RecentBills sales={sales} />

      {showEod && <EodModal onClose={() => setShowEod(false)} />}
    </div>
  )
}
