import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import nodemailer from 'nodemailer'
import pool from '../config/db.js'

const router = Router()

const validate = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('message').trim().notEmpty().withMessage('Message is required').isLength({ min: 10, max: 2000 }),
  body('company').optional().trim().isLength({ max: 200 }),
  body('phone').optional().trim().isLength({ max: 30 }),
  body('country').optional().trim().isLength({ max: 100 }),
  body('service').optional().trim().isLength({ max: 100 }),
]

async function sendEmails(data) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })

  // Admin notification
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: process.env.EMAIL_TO,
    subject: `New Enquiry: ${data.service || 'General'} — ${data.name} (${data.company || 'N/A'})`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;padding:24px;background:#f8faff;border-radius:12px;">
        <div style="background:#0B1B3E;color:white;padding:20px;border-radius:8px;margin-bottom:20px;">
          <h2 style="margin:0;font-size:20px;">New Contact Form Submission</h2>
          <p style="margin:4px 0 0;opacity:0.7;font-size:13px;">Athnav Integrated Solutions</p>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          ${[['Name',data.name],['Email',data.email],['Company',data.company||'—'],['Phone',data.phone||'—'],['Country',data.country||'—'],['Service',data.service||'—']].map(([k,v]) => `
          <tr><td style="padding:8px 12px;background:#fff;border-bottom:1px solid #eee;font-size:13px;color:#666;width:120px;">${k}</td>
          <td style="padding:8px 12px;background:#fff;border-bottom:1px solid #eee;font-size:13px;color:#1a1a2e;font-weight:500;">${v}</td></tr>`).join('')}
        </table>
        <div style="background:#fff;padding:16px;border-radius:8px;margin-top:16px;border-left:4px solid #3B7DD8;">
          <p style="margin:0;font-size:13px;color:#444;line-height:1.6;">${data.message}</p>
        </div>
      </div>`,
  })

  // Auto-reply to user
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: data.email,
    subject: 'Thank you for contacting Athnav',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;padding:24px;">
        <div style="background:#0B1B3E;color:white;padding:24px;border-radius:12px;margin-bottom:20px;text-align:center;">
          <h1 style="margin:0;font-size:24px;letter-spacing:-0.5px;">ATHNAV</h1>
          <p style="margin:4px 0 0;opacity:0.6;font-size:11px;letter-spacing:3px;">INTEGRATED SOLUTIONS</p>
        </div>
        <h2 style="color:#0B1B3E;">Thank you, ${data.name}!</h2>
        <p style="color:#555;line-height:1.6;">We've received your enquiry${data.service ? ` about <strong>${data.service}</strong>` : ''}. Our team will review your message and get back to you within <strong>1 business day</strong>.</p>
        <p style="color:#555;line-height:1.6;">If your matter is urgent, you can also reach us at:</p>
        <ul style="color:#3B7DD8;line-height:2;">
          <li>📧 <a href="mailto:info@athnav.com" style="color:#3B7DD8;">info@athnav.com</a></li>
          <li>📞 <a href="tel:+919968445365" style="color:#3B7DD8;">+91 9968 44 5365</a></li>
        </ul>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
        <p style="color:#999;font-size:12px;text-align:center;">© 2026 Athnav Integrated Solutions Pvt. Ltd. | Noida, Delhi NCR, India</p>
      </div>`,
  })
}

router.post('/', validate, async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() })

  const { name, email, company, phone, country, service, message } = req.body
  const ip = req.ip || req.connection.remoteAddress

  try {
    // Save to DB
    await pool.execute(
      'INSERT INTO contact_submissions (name, email, company, phone, country, service, message, ip_address) VALUES (?,?,?,?,?,?,?,?)',
      [name, email, company||null, phone||null, country||null, service||null, message, ip]
    )

    // Send emails (non-blocking in production for speed)
    sendEmails({ name, email, company, phone, country, service, message }).catch(console.error)

    res.json({ success: true, message: 'Your message has been received. We will be in touch within 1 business day.' })
  } catch (err) {
    console.error('Contact submit error:', err)
    res.status(500).json({ error: 'Unable to send message. Please try again or email us directly at info@athnav.com' })
  }
})

export default router
