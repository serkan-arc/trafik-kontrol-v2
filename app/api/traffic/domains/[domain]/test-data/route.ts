import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST - Generate test data for a domain
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await context.params
    
    // Get domain info
    const domainResult = await db.query(
      'SELECT * FROM master_domains WHERE domain = $1',
      [domain]
    )
    
    if (!domainResult.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Domain not found' },
        { status: 404 }
      )
    }
    
    const schema = domainResult.rows[0].db_schema
    
    // Start transaction
    await db.query('BEGIN')
    
    try {
      // 1. Add sample IP addresses
      const ipAddresses = [
        { ip: '192.168.1.1', list_type: 'whitelist', risk_score: 10, country: 'TR', city: 'Istanbul' },
        { ip: '10.0.0.1', list_type: 'graylist', risk_score: 50, country: 'US', city: 'New York' },
        { ip: '172.16.0.1', list_type: 'blacklist', risk_score: 90, country: 'CN', city: 'Beijing' },
        { ip: '8.8.8.8', list_type: 'whitelist', risk_score: 5, country: 'US', city: 'Mountain View' },
        { ip: '1.1.1.1', list_type: 'whitelist', risk_score: 5, country: 'US', city: 'San Francisco' },
        { ip: '192.0.2.1', list_type: 'unknown', risk_score: 30, country: 'DE', city: 'Frankfurt' },
      ]
      
      for (const ipData of ipAddresses) {
        await db.query(`
          INSERT INTO "${schema}_ip_addresses" 
          (ip_address, list_type, risk_score, country, city, first_seen, last_seen)
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          ON CONFLICT (ip_address) DO UPDATE
          SET list_type = $2, risk_score = $3, last_seen = NOW()
        `, [ipData.ip, ipData.list_type, ipData.risk_score, ipData.country, ipData.city])
      }
      
      // 2. Add traffic logs (some today, some older)
      const paths = ['/home', '/about', '/contact', '/api/data', '/login', '/products']
      const methods = ['GET', 'POST', 'GET', 'GET', 'POST', 'GET']
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
        'Googlebot/2.1 (+http://www.google.com/bot.html)',
        'facebookexternalhit/1.1',
        'Mozilla/5.0 (compatible; Baiduspider/2.0)',
      ]
      
      // Add 50 traffic logs
      for (let i = 0; i < 50; i++) {
        const ip = ipAddresses[Math.floor(Math.random() * ipAddresses.length)].ip
        const path = paths[Math.floor(Math.random() * paths.length)]
        const method = methods[Math.floor(Math.random() * methods.length)]
        const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)]
        const statusCode = Math.random() > 0.8 ? 404 : 200
        const hoursAgo = Math.floor(Math.random() * 72) // Random time in last 3 days
        
        await db.query(`
          INSERT INTO "${schema}_traffic_logs" 
          (ip_address, path, method, status_code, user_agent, created_at)
          VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '${hoursAgo} hours')
        `, [ip, path, method, statusCode, userAgent])
      }
      
      // 3. Add bot detections
      const bots = [
        { name: 'Googlebot', type: 'good', is_fake: false },
        { name: 'Baiduspider', type: 'bad', is_fake: false },
        { name: 'FakeGooglebot', type: 'bad', is_fake: true },
        { name: 'Facebookbot', type: 'good', is_fake: false },
      ]
      
      for (let i = 0; i < 20; i++) {
        const bot = bots[Math.floor(Math.random() * bots.length)]
        const ip = ipAddresses[Math.floor(Math.random() * ipAddresses.length)].ip
        const hoursAgo = Math.floor(Math.random() * 48)
        const blocked = bot.type === 'bad'
        
        await db.query(`
          INSERT INTO "${schema}_bot_detections" 
          (ip_address, bot_name, bot_type, is_fake, confidence_score, blocked, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '${hoursAgo} hours')
        `, [ip, bot.name, bot.type, bot.is_fake, Math.random() * 0.5 + 0.5, blocked])
      }
      
      // 4. Add spam detections
      for (let i = 0; i < 15; i++) {
        const ip = ipAddresses[Math.floor(Math.random() * ipAddresses.length)].ip
        const hoursAgo = Math.floor(Math.random() * 24)
        const spamScore = Math.floor(Math.random() * 100)
        const blocked = spamScore > 50
        
        await db.query(`
          INSERT INTO "${schema}_spam_detections" 
          (ip_address, form_type, spam_score, blocked, email, email_is_disposable, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '${hoursAgo} hours')
        `, [
          ip, 
          'contact_form', 
          spamScore, 
          blocked,
          `test${i}@example.com`,
          Math.random() > 0.7
        ])
      }
      
      // 5. Add form submissions
      for (let i = 0; i < 10; i++) {
        const ip = ipAddresses[Math.floor(Math.random() * ipAddresses.length)].ip
        const isSpam = Math.random() > 0.7
        
        await db.query(`
          INSERT INTO "${schema}_form_submissions" 
          (ip_address, form_data, is_spam, created_at)
          VALUES ($1, $2, $3, NOW() - INTERVAL '${Math.floor(Math.random() * 24)} hours')
        `, [
          ip,
          JSON.stringify({
            name: `Test User ${i}`,
            email: `test${i}@example.com`,
            message: `Test message ${i}`
          }),
          isSpam
        ])
      }
      
      // Commit transaction
      await db.query('COMMIT')
      
      return NextResponse.json({
        success: true,
        message: 'Test data generated successfully',
        data: {
          ip_addresses: ipAddresses.length,
          traffic_logs: 50,
          bot_detections: 20,
          spam_detections: 15,
          form_submissions: 10
        }
      })
      
    } catch (error) {
      await db.query('ROLLBACK')
      throw error
    }
    
  } catch (error: any) {
    console.error('Error generating test data:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}