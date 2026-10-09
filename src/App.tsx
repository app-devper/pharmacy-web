import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import SellPage from './pages/SellPage'
import StockPage from './pages/StockPage'
import CustomersPage from './pages/CustomersPage'
import ReportPage from './pages/ReportPage'
import Ky9Page from './pages/Ky9Page'
import Ky10Page from './pages/Ky10Page'
import Ky11Page from './pages/Ky11Page'
import Ky12Page from './pages/Ky12Page'
import ImportPage from './pages/ImportPage'
import SalesHistoryPage from './pages/SalesHistoryPage'
import SuppliersPage from './pages/SuppliersPage'
import ProfitPage from './pages/ProfitPage'
import ExpiryPage from './pages/ExpiryPage'
import MovementsPage from './pages/MovementsPage'
import UsersPage from './pages/UsersPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import AddDrugPage from './pages/AddDrugPage'
import EditDrugPage from './pages/EditDrugPage'
import HelpPage from './pages/HelpPage'
import StockCountPage from './pages/StockCountPage'
import OfflineSyncPage from './pages/OfflineSyncPage'
import LabelPrintPage from './pages/LabelPrintPage'
import { canOpen, type Page } from './lib/access'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-sm text-gray-500">กำลังตรวจสอบสิทธิ์…</p>
        </div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

/** Opens `page` only for a user the access policy lets in (lib/access). */
function PageRoute({ page, children }: { page: Page; children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user || !canOpen(user.role, page))
    return <Navigate to="/sell" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/sell" replace />} />
          <Route path="sell" element={<PageRoute page="/sell"><SellPage /></PageRoute>} />
          <Route path="sales" element={<PageRoute page="/sales"><SalesHistoryPage /></PageRoute>} />
          <Route path="stock" element={<PageRoute page="/stock"><StockPage /></PageRoute>} />
          <Route path="stock-count" element={<PageRoute page="/stock-count"><StockCountPage /></PageRoute>} />
          <Route path="labels" element={<PageRoute page="/labels"><LabelPrintPage /></PageRoute>} />
          <Route path="stock/new" element={<PageRoute page="/stock/new"><AddDrugPage /></PageRoute>} />
          <Route path="stock/:id/edit" element={<PageRoute page="/stock/:id/edit"><EditDrugPage /></PageRoute>} />
          <Route path="imports" element={<PageRoute page="/imports"><ImportPage /></PageRoute>} />
          <Route path="suppliers" element={<PageRoute page="/suppliers"><SuppliersPage /></PageRoute>} />
          <Route path="customers" element={<PageRoute page="/customers"><CustomersPage /></PageRoute>} />
          <Route path="report" element={<PageRoute page="/report"><ReportPage /></PageRoute>} />
          <Route path="profit" element={<PageRoute page="/profit"><ProfitPage /></PageRoute>} />
          <Route path="expiry" element={<PageRoute page="/expiry"><ExpiryPage /></PageRoute>} />
          <Route path="movements" element={<PageRoute page="/movements"><MovementsPage /></PageRoute>} />
          <Route path="offline-sync" element={<PageRoute page="/offline-sync"><OfflineSyncPage /></PageRoute>} />
          <Route path="ky9" element={<PageRoute page="/ky9"><Ky9Page /></PageRoute>} />
          <Route path="ky10" element={<PageRoute page="/ky10"><Ky10Page /></PageRoute>} />
          <Route path="ky11" element={<PageRoute page="/ky11"><Ky11Page /></PageRoute>} />
          <Route path="ky12" element={<PageRoute page="/ky12"><Ky12Page /></PageRoute>} />
          <Route path="users" element={<PageRoute page="/users"><UsersPage /></PageRoute>} />
          <Route path="profile" element={<PageRoute page="/profile"><ProfilePage /></PageRoute>} />
          <Route path="settings" element={<PageRoute page="/settings"><SettingsPage /></PageRoute>} />
          <Route path="help" element={<PageRoute page="/help"><HelpPage /></PageRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
