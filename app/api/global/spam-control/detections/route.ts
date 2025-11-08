import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

// GET - List spam detections with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ip = searchParams.get('ip')
    const domain = searchParams.get('domain')
    const minScore = searchParams.get('min_score')
    const blocked = searchParams.get('blocked')
    const formType = searchParams.get('form_type')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = (page - 1) * limit
    
    let query = 'SELECT * FROM global_spam_detections WHERE 1=1'
    const params: any[] = []
    let paramIndex = 1
    
    if (ip) {
      query += ` AND ip = $${paramIndex}`
      params.push(ip)
      paramIndex++
    }
    
    if (domain) {
      query += ` AND domain ILIKE $${paramIndex}`
      params.push(`%${domain}%`)
      paramIndex++
    }
    
    if (minScore) {
      query += ` AND spam_score >= $${paramIndex}`
      params.push(parseInt(minScore))
      paramIndex++
    }
    
    if (blocked !== null && blocked !== undefined) {
      query += ` AND blocked = $${paramIndex}`
      params.push(blocked === 'true')
      paramIndex++
    }
    
    if (formType) {
      query += ` AND form_type = $${paramIndex}`
      params.push(formType)
      paramIndex++
    }
    
    // Count total for pagination
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)')
    const countResult = await pool.query(countQuery, params)
    const total = parseInt(countResult.rows[0].count)
    
    // Add pagination
    query += ` ORDER BY detected_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(limit, offset)
    
    const result = await pool.query(query, params)
    
    // Calculate statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_detections,
        COUNT(CASE WHEN blocked = true THEN 1 END) as blocked_count,
        AVG(spam_score) as avg_spam_score,
        COUNT(CASE WHEN email_is_disposable = true THEN 1 END) as disposable_emails,
        COUNT(CASE WHEN contains_urls = true THEN 1 END) as with_urls,
        COUNT(DISTINCT ip) as unique_ips,
        COUNT(DISTINCT domain) as affected_domains
      FROM global_spam_detections
      WHERE detected_at > NOW() - INTERVAL '24 hours'
    `
    const statsResult = await pool.query(statsQuery)
    
    return NextResponse.json({
      success: true,
      data: {
        detections: result.rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        statistics: statsResult.rows[0]
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

// POST - Report spam (manual or from form submissions)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      ip,
      domain,
      form_type,
      content_hash,
      spam_score,
      matched_patterns,
      action,
      blocked,
      email,
      email_is_disposable,
      phone,
      contains_urls,
      url_count,
      submission_data
    } = body
    
    // Validation
    if (!ip || !domain) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: ip, domain' },
        { status: 400 }
      )
    }
    
    const query = `
      INSERT INTO global_spam_detections 
      (ip, domain, form_type, content_hash, spam_score, matched_patterns, action, 
       blocked, email, email_is_disposable, phone, contains_urls, url_count, submission_data)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `
    
    const result = await pool.query(query, [
      ip,
      domain,
      form_type,
      content_hash,
      spam_score || 0,
      JSON.stringify(matched_patterns || []),
      action,
      blocked || false,
      email,
      email_is_disposable || false,
      phone,
      contains_urls || false,
      url_count || 0,
      JSON.stringify(submission_data || {})
    ])
    
    // Update matched patterns statistics
    if (matched_patterns && Array.isArray(matched_patterns)) {
      for (const pattern of matched_patterns) {
        if (pattern.pattern_id) {
          await pool.query(
            `UPDATE global_spam_patterns 
             SET matches_count = matches_count + 1, 
                 last_matched_at = NOW() 
             WHERE id = $1`,
            [pattern.pattern_id]
          )
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error: any) {
    console.error('Error reporting spam:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Delete spam detection record
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Detection ID is required' },
        { status: 400 }
      )
    }
    
    const result = await pool.query(
      'DELETE FROM global_spam_detections WHERE id = $1 RETURNING *',
      [id]
    )
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Detection not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Detection deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting spam detection:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
