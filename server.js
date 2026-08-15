import 'dotenv/config'
import express from 'express'
import authHandler from './api/auth.js'
import recordsHandler from './api/records.js'

const app = express()
app.use(express.json())

app.all('/api/auth', (req, res) => authHandler(req, res))
app.all('/api/records', (req, res) => recordsHandler(req, res))

app.listen(3001, () => {
  console.log('API server: http://localhost:3001')
})
