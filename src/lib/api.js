const BASE = '/api'

async function post(path, body) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => null)
  return { data: res.ok ? json : null, error: res.ok ? null : { status: res.status, ...(json || {}) } }
}

async function put(path, body) {
  const res = await fetch(BASE + path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { error: res.ok ? null : { status: res.status } }
}

export const api = {
  async login(username, password_hash) {
    return post('/auth', { action: 'login', username, password_hash })
  },

  async register(username, password_hash, display_name) {
    return post('/auth', { action: 'register', username, password_hash, display_name })
  },

  async getRecords(user_id, start, end) {
    const params = new URLSearchParams({ user_id })
    if (start) params.append('start', start)
    if (end) params.append('end', end)
    const res = await fetch(`${BASE}/records?${params}`)
    const json = await res.json().catch(() => [])
    return { data: res.ok ? json : null, error: res.ok ? null : {} }
  },

  async createRecord(payload) {
    return post('/records', payload)
  },

  async updateRecord(id, payload) {
    return put(`/records?id=${id}`, payload)
  },

  async deleteRecord(id) {
    const res = await fetch(`${BASE}/records?id=${id}`, { method: 'DELETE' })
    return { error: res.ok ? null : {} }
  },
}
