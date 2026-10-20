import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppToastProvider } from './components/ui/AppToastProvider.tsx'
import './index.css'
import App from './App.tsx'
import RealtimeConnection from './components/realtime/RealtimeConnection.tsx'
import RealtimeNotifications from './components/realtime/RealtimeNotifications.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppToastProvider>
      <RealtimeConnection />
      <RealtimeNotifications />
      <App />
    </AppToastProvider>
  </StrictMode>,
)
