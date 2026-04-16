import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ToastProvider } from './components/ToastContext.jsx' // 👈 1. Add this import

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider> {/* 👈 2. Wrap App with ToastProvider */}
      <App />
    </ToastProvider>
  </StrictMode>,
)