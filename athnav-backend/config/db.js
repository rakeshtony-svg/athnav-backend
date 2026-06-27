import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+05:30', // IST
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

export async function testConnection() {
  try {
    const conn = await pool.getConnection()
    console.log('✅ MySQL connected:', process.env.DB_HOST)
    conn.release()
  } catch (err) {
    console.error("❌ MySQL connection failed");
console.error(err);
  }
}

// Create tables on startup
export async function initDB() {
  const queries = [
    `CREATE TABLE IF NOT EXISTS contact_submissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL,
      company VARCHAR(200),
      phone VARCHAR(30),
      country VARCHAR(100),
      service VARCHAR(100),
      message TEXT NOT NULL,
      ip_address VARCHAR(45),
      status ENUM('new','read','replied') DEFAULT 'new',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status ENUM('active','unsubscribed') DEFAULT 'active'
    )`,
  ]
  for (const q of queries) {
    try { await pool.execute(q) } catch (e) { console.error('DB init error:', e.message) }
  }
}

export default pool
