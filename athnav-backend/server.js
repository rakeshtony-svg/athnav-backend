import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'

dotenv.config()

import contactRouter from './routes/contact.js'
import newsletterRouter from './routes/newsletter.js'
import healthRouter from './routes/health.js'
import { testConnection, initDB } from './config/db.js'

const app = express()
const PORT = process.env.PORT || 5000

// ── Security ──────────────────────────────────────────────
app.use(helmet())
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

// ── CORS ──────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',')
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error(`CORS: origin ${origin} not allowed`))
  },
  methods: ['GET', 'POST'],
  credentials: true,
}))

// ── Rate limiting ─────────────────────────────────────────
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false })
const strictLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, message: { error: 'Too many submissions. Please try again later.' } })

app.use(limiter)
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true, limit: '10kb' }))

// ── Routes ────────────────────────────────────────────────
app.use('/api/health', healthRouter)
app.use('/api/contact', strictLimiter, contactRouter)
app.use('/api/newsletter', strictLimiter, newsletterRouter)

// ── Root ──────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ status: 'ok', service: 'Athnav API', version: '1.0.0' }))

// ── 404 ───────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route not found' }))

// ── Error handler ─────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message })
})


await testConnection();
await initDB();
app.listen(PORT, () => {
  console.log(`✅ Athnav API running on port ${PORT}`)
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`)
})

export default app
