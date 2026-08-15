const SESSION_KEY = 'foodlog_user_v2'
const HASH_PREFIX = 'foodlog:'

// SHA-256 해시 (Web Crypto API - 외부 라이브러리 불필요)
export async function hashPassword(password) {
  const encoder = new TextEncoder()
  const data = encoder.encode(HASH_PREFIX + password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}
