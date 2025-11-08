import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Common disposable email domains
const DISPOSABLE_EMAIL_DOMAINS = [
  'tempmail.com', 'guerrillamail.com', 'mailinator.com', '10minutemail.com',
  'throwaway.email', 'yopmail.com', 'temp-mail.org', 'fakeinbox.com',
  'trashmail.com', 'maildrop.cc', 'mintemail.com', 'sharklasers.com'
]

// GET - List spam detections for a domain
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await context.params
    const { searchParams } = new URL(request.url)
    
    // Filters
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const blocked = searchParams.get('blocked')
    const form_type = searchParams.get('form_type')
    const min_score = searchParams.get('min_score')
    
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
    
    // Build query
    let query = `
      SELECT * FROM "${schema}_spam_detections"
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1
    
    if (blocked !== null && blocked !== undefined) {
      query += ` AND blocked = $${paramIndex}`
      params.push(blocked === 'true')
      paramIndex++
    }
    
    if (form_type) {
      query += ` AND form_type = $${paramIndex}`
      params.push(form_type)
      paramIndex++
    }
    
    if (min_score) {
      query += ` AND spam_score >= $${paramIndex}`
      params.push(parseInt(min_score))
      paramIndex++
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(limit, offset)
    
    // Get detections
    const detections = await db.query(query, params).catch(() => ({ rows: [] }))
    
    // Get statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE blocked = true) as blocked_count,
        COUNT(*) FILTER (WHERE email_is_disposable = true) as disposable_count,
        AVG(spam_score) as avg_score,
        MAX(spam_score) as max_score
      FROM "${schema}_spam_detections"
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `
    const stats = await db.query(statsQuery).catch(() => ({ 
      rows: [{ 
        total: 0, 
        blocked_count: 0, 
        disposable_count: 0,
        avg_score: 0,
        max_score: 0
      }] 
    }))
    
    return NextResponse.json({
      success: true,
      detections: detections.rows,
      statistics: stats.rows[0],
      pagination: {
        total: parseInt(stats.rows[0].total),
        limit,
        offset
      }
    })
    
  } catch (error: any) {
    console.error('Error fetching spam detections:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// POST - Log a spam detection
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await context.params
    const data = await request.json()
    
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
    
    // Initialize spam score and matched patterns
    let spamScore = 0
    const matchedPatterns = []
    
    // Get active spam patterns
    const patterns = await db.query(`
      SELECT * FROM "${schema}_spam_patterns"
      WHERE enabled = true
    `).catch(() => ({ rows: [] }))
    
    // Check each pattern
    for (const pattern of patterns.rows) {
      let isMatch = false
      
      if (pattern.pattern_type === 'keyword' && data.content) {
        // Check for keyword matches
        const keywords = pattern.pattern_value.split('|')
        for (const keyword of keywords) {
          if (data.content.toLowerCase().includes(keyword.toLowerCase())) {
            isMatch = true
            break
          }
        }
      } else if (pattern.pattern_type === 'email_domain' && data.email) {
        // Check email domain
        const domain = data.email.split('@')[1]
        const domains = pattern.pattern_value.split('|')
        if (domains.includes(domain)) {
          isMatch = true
        }
      } else if (pattern.pattern_type === 'url_pattern' && data.content) {
        // Check for URL patterns
        const urlPatterns = pattern.pattern_value.split('|')
        for (const urlPattern of urlPatterns) {
          if (data.content.includes(urlPattern)) {
            isMatch = true
            break
          }
        }
      } else if (pattern.pattern_type === 'regex' && pattern.is_regex && data.content) {
        // Check regex pattern
        try {
          const regex = new RegExp(pattern.pattern_value, 'gi')
          if (regex.test(data.content)) {
            isMatch = true
          }
        } catch (e) {
          console.error('Invalid regex pattern:', pattern.pattern_value)
        }
      } else if (pattern.pattern_type === 'behavior') {
        // Check behavior patterns (e.g., url_count > 3)
        if (pattern.pattern_value.includes('url_count')) {
          const urlRegex = /(https?:\/\/[^\s]+)/g
          const urls = data.content?.match(urlRegex) || []
          const urlCount = urls.length
          
          // Parse condition (simple implementation)
          const match = pattern.pattern_value.match(/url_count\s*>\s*(\d+)/)
          if (match && urlCount > parseInt(match[1])) {
            isMatch = true
          }
        }
      }
      
      if (isMatch) {
        matchedPatterns.push({
          pattern_id: pattern.id,
          pattern_name: pattern.pattern_name,
          severity: pattern.severity
        })
        
        spamScore += pattern.severity * 10 // Each severity point adds 10 to spam score
        
        // Update pattern match count
        await db.query(`
          UPDATE "${schema}_spam_patterns"
          SET matches_count = matches_count + 1,
              last_matched_at = NOW()
          WHERE id = $1
        `, [pattern.id]).catch(() => {})
      }
    }
    
    // Check for disposable email
    const isDisposableEmail = data.email ? 
      DISPOSABLE_EMAIL_DOMAINS.some(domain => data.email.includes(domain)) : false
    
    if (isDisposableEmail) {
      spamScore += 30 // Add 30 points for disposable email
    }
    
    // Count URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const urls = data.content?.match(urlRegex) || []
    const urlCount = urls.length
    
    if (urlCount > 5) {
      spamScore += 20 // Add 20 points for excessive URLs
    }
    
    // Cap spam score at 100
    spamScore = Math.min(spamScore, 100)
    
    // Determine action based on score
    let action = 'pass'
    let blocked = false
    
    if (spamScore >= 80) {
      action = 'block'
      blocked = true
    } else if (spamScore >= 50) {
      action = 'quarantine'
      blocked = true
    } else if (spamScore >= 30) {
      action = 'flag'
    }
    
    // Override with highest severity pattern action if more severe
    if (matchedPatterns.length > 0) {
      const highestSeverityPattern = matchedPatterns.reduce((max, p) => 
        p.severity > max.severity ? p : max
      )
      
      // Get the pattern's recommended action
      const patternResult = await db.query(`
        SELECT action FROM "${schema}_spam_patterns"
        WHERE id = $1
      `, [highestSeverityPattern.pattern_id]).catch(() => null)
      
      if (patternResult?.rows[0]?.action === 'block') {
        action = 'block'
        blocked = true
      }
    }
    
    // Insert detection
    const result = await db.query(`
      INSERT INTO "${schema}_spam_detections" 
      (ip_address, form_type, spam_score, matched_patterns, action, 
       blocked, email, email_is_disposable, phone, contains_urls, 
       url_count, content)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      data.ip_address,
      data.form_type || 'contact',
      spamScore,
      JSON.stringify(matchedPatterns),
      action,
      blocked,
      data.email,
      isDisposableEmail,
      data.phone,
      urlCount > 0,
      urlCount,
      data.content?.substring(0, 1000) // Limit content to 1000 chars
    ])
    
    return NextResponse.json({
      success: true,
      detection: result.rows[0],
      action,
      blocked,
      spam_score: spamScore
    })
    
  } catch (error: any) {
    console.error('Error logging spam detection:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}