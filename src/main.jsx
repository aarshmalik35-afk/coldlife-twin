import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './styles.css'
import './claude-liquid-glass.css'

// Consume Supabase's implicit-flow session fragment before HashRouter reads the URL.
const OPERATOR_SESSION_KEY = 'coldlife_operator_session'
if (window.location.hash.includes('access_token=')) {
  const authParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const accessToken = authParams.get('access_token')
  if (accessToken) {
    const expiresIn = Number(authParams.get('expires_in') || 3600)
    localStorage.setItem(OPERATOR_SESSION_KEY, JSON.stringify({
      access_token: accessToken,
      refresh_token: authParams.get('refresh_token') || null,
      token_type: authParams.get('token_type') || 'bearer',
      expires_in: expiresIn,
      expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    }))
    window.history.replaceState(null, '', window.location.pathname + window.location.search + '#/')
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
)
