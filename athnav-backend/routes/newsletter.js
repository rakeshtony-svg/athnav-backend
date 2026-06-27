import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import pool from '../config/db.js'

const router = Router()

router.post('/', [body('email').isEmail().normalizeEmail()], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() })

  try {
    await pool.execute(
      'INSERT INTO newsletter_subscribers (email) VALUES (?) ON DUPLICATE KEY UPDATE status="active"',
      [req.body.email]
    )
    res.json({ success: true, message: 'Subscribed successfully!' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Subscription failed. Please try again.' })
  }
})

export default router
