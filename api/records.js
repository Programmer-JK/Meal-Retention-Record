import { neon } from '@neondatabase/serverless'

export default async function handler(req, res) {
  try {
    const sql = neon(process.env.DATABASE_URL)

    if (req.method === 'GET') {
      const { user_id, start, end } = req.query
      let rows
      if (start && end) {
        rows = await sql`
          SELECT * FROM records
          WHERE user_id = ${user_id}
            AND collection_date >= ${start + 'T00:00:00'}
            AND collection_date <= ${end + 'T23:59:59'}
          ORDER BY collection_date DESC
        `
      } else if (start) {
        rows = await sql`
          SELECT * FROM records
          WHERE user_id = ${user_id}
            AND collection_date >= ${start + 'T00:00:00'}
          ORDER BY collection_date DESC
        `
      } else if (end) {
        rows = await sql`
          SELECT * FROM records
          WHERE user_id = ${user_id}
            AND collection_date <= ${end + 'T23:59:59'}
          ORDER BY collection_date DESC
        `
      } else {
        rows = await sql`
          SELECT * FROM records
          WHERE user_id = ${user_id}
          ORDER BY collection_date DESC
        `
      }
      return res.status(200).json(rows)
    }

    if (req.method === 'POST') {
      const { user_id, collection_date, disposal_date, morning_snack, lunch, afternoon_snack, dinner, author } = req.body
      const rows = await sql`
        INSERT INTO records (id, user_id, collection_date, disposal_date, morning_snack, lunch, afternoon_snack, dinner, author, created_at)
        VALUES (gen_random_uuid(), ${user_id}, ${collection_date}, ${disposal_date}, ${morning_snack}, ${lunch}, ${afternoon_snack}, ${dinner}, ${author}, NOW())
        RETURNING *
      `
      return res.status(200).json(rows[0])
    }

    if (req.method === 'PUT') {
      const { id } = req.query
      const { user_id, collection_date, disposal_date, morning_snack, lunch, afternoon_snack, dinner, author } = req.body
      await sql`
        UPDATE records SET
          user_id = ${user_id},
          collection_date = ${collection_date},
          disposal_date = ${disposal_date},
          morning_snack = ${morning_snack},
          lunch = ${lunch},
          afternoon_snack = ${afternoon_snack},
          dinner = ${dinner},
          author = ${author}
        WHERE id = ${id}
      `
      return res.status(200).json({ ok: true })
    }

    if (req.method === 'DELETE') {
      const { id } = req.query
      await sql`DELETE FROM records WHERE id = ${id}`
      return res.status(200).json({ ok: true })
    }

    return res.status(405).end()
  } catch (err) {
    console.error('[records]', err)
    return res.status(500).json({ error: err.message })
  }
}
