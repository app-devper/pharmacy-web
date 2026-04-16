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

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-sm text-gray-500">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
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
          <Route path="imports" element={<ImportPage />} />
          <Route path="suppliers" element={<SuppliersPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="report" element={<ReportPage />} />
          <Route path="profit" element={<ProfitPage />} />
          <Route path="expiry" element={<ExpiryPage />} />
          <Route path="ky9" element={<Ky9Page />} />
          <Route path="ky10" element={<Ky10Page />} />
          <Route path="ky11" element={<Ky11Page />} />
          <Route path="ky12" element={<Ky12Page />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
