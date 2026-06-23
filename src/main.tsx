import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import App from './App';
import './i18n';

// Mock mode: auto-login with fake user for preview (dev only, never enabled in production)
if (import.meta.env.VITE_USE_MOCK === 'true') {
    if (!localStorage.getItem('token')) {
        localStorage.setItem('token', 'mock-token-for-preview');
        localStorage.setItem('email', 'demo@zenstats.com');
        localStorage.setItem('name', 'Demo User');
    }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)