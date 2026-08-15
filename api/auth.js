import { neon } from '@neondatabase/serverless'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const sql = neon(process.env.DATABASE_URL)
  const { action, username, password_hash, display_name } = req.body

  if (action === 'login') {
    const rows = await sql`
      SELECT id, username, display_name FROM users
      WHERE username = ${username.trim().toLowerCase()}
        AND password_hash = ${password_hash}
      LIMIT 1
    `
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' })
    return res.status(200).json(rows[0])
  }

  if (action === 'register') {
    try {
      const rows = await sql`
        INSERT INTO users (id, username, password_hash, display_name, created_at)
        VALUES (gen_random_uuid(), ${username.trim().toLowerCase()}, ${password_hash}, ${display_name.trim()}, NOW())
        RETURNING id, username, display_name
      `
      return res.status(200).json(rows[0])
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'Username taken' })
      return res.status(500).json({ error: 'Failed to create account' })
    }
  }

  return res.status(400).json({ error: 'Invalid action' })
}
