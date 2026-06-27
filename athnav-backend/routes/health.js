import { Router } from 'express'
import pool from '../config/db.js'

const router = Router()

router.get('/', async (req, res) => {
  let db = 'disconnected'
  try {
    await pool.query('SELECT 1')
    db = 'connected'
  } catch (e) { db = 'error: ' + e.message }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()) + 's',
    database: db,
    environment: process.env.NODE_ENV || 'development',
  })
})

export default router
