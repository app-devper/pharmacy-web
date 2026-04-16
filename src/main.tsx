import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import { CartProvider } from './context/CartContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AppProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </AppProvider>
    </AuthProvider>
  </StrictMode>,
)
