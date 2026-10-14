import { useState, useMemo, useCallback } from 'react'
import type { Dashboard, DailyData, MonthlyData } from '../types/report'
import type { Sale } from '../types/sale'
import { getDashboard, getDaily } from '../api/report'
import { useServerRead } from '../hooks/useServerRead'
import ReportMetrics from '../components/report/ReportMetrics'
import SalesBarChart from '../components/report/SalesBarChart'
import MonthlyChart from '../components/report/MonthlyChart'
import TopDrugsChart from '../components/report/TopDrugsChart'
import SlowDrugsTable from '../components/report/SlowDrugsTable'
import RecentBills from '../components/report/RecentBills'
import EodModal from '../components/report/EodModal'
import DayPicker from '../components/ui/DayPicker'
import Button from '../components/ui/Button'
import { useCan } from '../hooks/useCan'
import Spinner from '../components/ui/Spinner'
import { monthBangkok } from '../utils/date'

const DAY_OPTIONS = [7, 14, 30]

/**
 * Financial and customer reports are ADMIN+; MANAGER sees only the
 * operational slow-drugs view (shared role policy, KMP ADR-0004).
 */
export default function ReportPage() {
  const financial = useCan('view_financial_report')
  return financial ? <AdminReport /> : <ManagerReport />
}

function ManagerReport() {
  return (
    <div className="p-6">
      <SlowDrugsTable />
    </div>
  )
}

const DEFAULT_DAYS = 7
const EMPTY_MONTHLY: MonthlyData[] = []
const EMPTY_SALES: Sale[] = []
const EMPTY_DAILY: DailyData[] = []

function AdminReport() {
  const [days, setDays]         = useState(DEFAULT_DAYS)
  const [showEod, setShowEod]   = useState(false)

  // One call fetches summary + daily + monthly + recent sales; it follows stock
  // changes, so a sale, void or return elsewhere shows up here.
  const dashboardRead = useCallback(() => getDashboard(DEFAULT_DAYS), [])
  const { data: dashboard, loading } = useServerRead<Dashboard | null>(dashboardRead, null, { followStock: true })

  // Another day range needs only the daily chart; the default comes with the dashboard.
  const dailyRead = useCallback(
    () => (days === DEFAULT_DAYS ? Promise.resolve(null) : getDaily(days)),
    [days],
  )
  const { data: otherDaily } = useServerRead<DailyData[] | null>(dailyRead, null, { followStock: true })

  const summary = dashboard?.summary ?? null
  const monthly = dashboard?.monthly ?? EMPTY_MONTHLY
  const sales = dashboard?.recent_sales ?? EMPTY_SALES
  const daily = (days === DEFAULT_DAYS ? dashboard?.daily : otherDaily) ?? EMPTY_DAILY

  const currentMonthProfit = useMemo(() => {
    const thisMonth = monthBangkok()
    return monthly.find(m => m.month === thisMonth)?.profit
  }, [monthly])

  if (loading && !dashboard) return <Spinner />

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
