import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import { CartProvider } from './context/CartContext'
import { DrugsProvider } from './context/DrugsContext'
import { SettingsProvider } from './context/SettingsContext'
import PreferencesApplier from './components/PreferencesApplier'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PreferencesApplier />
    <AuthProvider>
      <SettingsProvider>
        <DrugsProvider>
          <AppProvider>
            <CartProvider>
              <App />
            </CartProvider>
          </AppProvider>
        </DrugsProvider>
      </SettingsProvider>
    </AuthProvider>
  </StrictMode>,
)
