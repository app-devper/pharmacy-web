import { useState, useEffect, useMemo } from 'react'
import type { ReportSummary, DailyData, MonthlyData } from '../types/report'
import type { Sale } from '../types/sale'
import { getDashboard, getDaily } from '../api/report'
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
import { useIsAdmin } from '../hooks/useIsAdmin'
import Spinner from '../components/ui/Spinner'
import { monthBangkok } from '../utils/date'

const DAY_OPTIONS = [7, 14, 30]

export default function ReportPage() {
  const isAdmin = useIsAdmin()
  const [summary, setSummary]   = useState<ReportSummary | null>(null)
  const [daily, setDaily]       = useState<DailyData[]>([])
  const [monthly, setMonthly]   = useState<MonthlyData[]>([])
  const [sales, setSales]       = useState<Sale[]>([])
  const [loading, setLoading]   = useState(true)
  const [days, setDays]         = useState(7)
  const [showEod, setShowEod]   = useState(false)
  const showToast = useToast()

  // Initial load: ONE HTTP call fetches summary + daily + monthly + recent_sales in parallel on the server
  useEffect(() => {
    let mounted = true
    setLoading(true)
    getDashboard(days)
      .then(d => {
        if (!mounted) return
        setSummary(d.summary)
        setDaily(d.daily)
        setMonthly(d.monthly)
        setSales(d.recent_sales)
      })
      .catch((e: unknown) => { if (mounted) showToast((e as Error).message, 'error') })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Days selector only reloads the daily chart (summary+monthly+recent don't depend on days)
  const isFirstDays = useMemo(() => ({ v: true }), [])
  useEffect(() => {
    // Skip the first fire: initial dashboard call already populated `daily` for the default days.
    if (isFirstDays.v) { isFirstDays.v = false; return }
    let mounted = true
    getDaily(days)
      .then(d => { if (mounted) setDaily(d) })
      .catch((e: unknown) => { if (mounted) showToast((e as Error).message, 'error') })
    return () => { mounted = false }
  }, [days, showToast, isFirstDays])

  const currentMonthProfit = useMemo(() => {
    const thisMonth = monthBangkok()
    return monthly.find(m => m.month === thisMonth)?.profit
  }, [monthly])

  if (loading) return <Spinner />

  return (
    <div className="p-6">
      <div className="flex justify-end mb-4">
        {isAdmin && <Button onClick={() => setShowEod(true)}>ปิดรอบ</Button>}
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
