import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './index.css'
import { queryClient } from './lib/query-client'
import { applyTheme, getStoredTheme } from './lib/theme'

// Áp theme trước khi React render để tránh nháy sáng/tối (FOUC).
applyTheme(getStoredTheme())

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('root_element_not_found')

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
