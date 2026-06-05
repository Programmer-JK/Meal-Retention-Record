import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { hashPassword } from '../lib/auth'

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!username || !password) return setError('아이디와 비밀번호를 입력해주세요.')
    setLoading(true)
    setError('')

    const hash = await hashPassword(password)

    const { data, error: dbError } = await supabase
      .from('users')
      .select('id, username, display_name')
      .eq('username', username.trim().toLowerCase())
      .eq('password_hash', hash)
      .single()

    if (dbError || !data) {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.')
    } else {
      onLogin(data)
    }

    setLoading(false)
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!username || !displayName || !password) return setError('모든 항목을 입력해주세요.')
    if (password.length < 4) return setError('비밀번호는 4자 이상이어야 합니다.')
    setLoading(true)
    setError('')

    const hash = await hashPassword(password)

    const { data, error: dbError } = await supabase
      .from('users')
      .insert({
        username: username.trim().toLowerCase(),
        password_hash: hash,
        display_name: displayName.trim(),
      })
      .select('id, username, display_name')
      .single()

    if (dbError) {
      setError(dbError.code === '23505' ? '이미 사용 중인 아이디입니다.' : '계정 생성에 실패했습니다.')
    } else {
      onLogin(data)
    }

    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>☀ 보존식 기록표</h1>
          <p>도봉구 어린이급식관리지원센터</p>
        </div>

        <div className="login-tabs">
          <button
            className={mode === 'login' ? 'tab active' : 'tab'}
            onClick={() => { setMode('login'); setError('') }}
          >
            로그인
          </button>
          <button
            className={mode === 'register' ? 'tab active' : 'tab'}
            onClick={() => { setMode('register'); setError('') }}
          >
            계정 만들기
          </button>
        </div>

        <form onSubmit={mode === 'login' ? handleLogin : handleRegister}>
          <div className="form-group">
            <label>아이디</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="아이디 입력"
              autoComplete="username"
            />
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label>이름</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="실명 입력"
              />
            </div>
          )}

          <div className="form-group">
            <label>비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && <p className="error-msg">{error}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '처리 중...' : mode === 'login' ? '로그인' : '계정 만들기'}
          </button>
        </form>
      </div>
    </div>
  )
}
