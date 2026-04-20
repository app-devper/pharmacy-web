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

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user || !['ADMIN', 'SUPER'].includes(user.role))
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
          <Route path="sell" element={<SellPage />} />
          <Route path="sales" element={<SalesHistoryPage />} />
          <Route path="stock" element={<StockPage />} />
          <Route path="stock/new"       element={<AdminRoute><AddDrugPage /></AdminRoute>} />
          <Route path="stock/:id/edit"  element={<AdminRoute><EditDrugPage /></AdminRoute>} />
          <Route path="imports"   element={<AdminRoute><ImportPage /></AdminRoute>} />
          <Route path="suppliers" element={<AdminRoute><SuppliersPage /></AdminRoute>} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="report"    element={<ReportPage />} />
          <Route path="profit"    element={<AdminRoute><ProfitPage /></AdminRoute>} />
          <Route path="expiry"    element={<AdminRoute><ExpiryPage /></AdminRoute>} />
          <Route path="movements" element={<MovementsPage />} />
          <Route path="ky9"  element={<AdminRoute><Ky9Page /></AdminRoute>} />
          <Route path="ky10" element={<AdminRoute><Ky10Page /></AdminRoute>} />
          <Route path="ky11" element={<AdminRoute><Ky11Page /></AdminRoute>} />
          <Route path="ky12" element={<AdminRoute><Ky12Page /></AdminRoute>} />
          <Route path="users" element={<AdminRoute><UsersPage /></AdminRoute>} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<AdminRoute><SettingsPage /></AdminRoute>} />
          <Route path="help" element={<HelpPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
