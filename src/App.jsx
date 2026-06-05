import { useState } from 'react'
import { getSession, saveSession, clearSession } from './lib/auth'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

export default function App() {
  const [user, setUser] = useState(() => getSession()) // 자동 로그인

  const handleLogin = (userData) => {
    saveSession(userData)
    setUser(userData)
  }

  const handleLogout = () => {
    clearSession()
    setUser(null)
  }

  return user
    ? <Dashboard user={user} onLogout={handleLogout} />
    : <Login onLogin={handleLogin} />
}
