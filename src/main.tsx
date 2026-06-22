import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProvider } from './context/AppContext.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import { LoaderProvider } from './context/LoaderContext.tsx'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AppProvider>
        <LoaderProvider>
          <App />
        </LoaderProvider>
      </AppProvider>
    </AuthProvider>
  </StrictMode>,
)


