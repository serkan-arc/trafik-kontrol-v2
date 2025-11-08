import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'traffic_control',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 20,
})

// Patterns endpoints
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get('endpoint')

    if (endpoint === 'patterns') {
      return await getPatterns(searchParams)
    } else if (endpoint === 'detections') {
      return await getDetections(searchParams)
    } else if (endpoint === 'disposable-emails') {
      return await getDisposableEmails(searchParams)
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid endpoint'
    }, { status: 400 })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

async function getPatterns(searchParams: URLSearchParams) {
  const patternType = searchParams.get('pattern_type')
  const enabled = searchParams.get('enabled')

  let conditions: string[] = []
  let params: any[] = []
  let paramIndex = 1

  if (patternType) {
    conditions.push(`pattern_type = $${paramIndex}`)
    params.push(patternType)
    paramIndex++
  }

  if (enabled !== null && enabled !== undefined) {
    conditions.push(`enabled = $${paramIndex}`)
    params.push(enabled === 'true')
    paramIndex++
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const query = `
    SELECT *
    FROM global_spam_patterns
    ${whereClause}
    ORDER BY severity DESC, pattern_name
  `

  const result = await pool.query(query, params)

  const statsQuery = `
    SELECT 
      COUNT(*) as total_patterns,
      COUNT(*) FILTER (WHERE enabled = true) as enabled_patterns,
      AVG(severity) as avg_severity
    FROM global_spam_patterns
  `
  const statsResult = await pool.query(statsQuery)

  return NextResponse.json({
    success: true,
    data: {
      patterns: result.rows,
      statistics: statsResult.rows[0]
    }
  })
}

async function getDetections(searchParams: URLSearchParams) {
  const ip = searchParams.get('ip')
  const domain = searchParams.get('domain')
  const limit = parseInt(searchParams.get('limit') || '100')

  let conditions: string[] = []
  let params: any[] = []
  let paramIndex = 1

  if (ip) {
    conditions.push(`ip = $${paramIndex}`)
    params.push(ip)
    paramIndex++
  }

  if (domain) {
    conditions.push(`domain = $${paramIndex}`)
    params.push(domain)
    paramIndex++
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  params.push(limit)
  const query = `
    SELECT *
    FROM global_spam_detections
    ${whereClause}
    ORDER BY detected_at DESC
    LIMIT $${paramIndex}
  `

  const result = await pool.query(query, params)

  const statsQuery = `
    SELECT 
      COUNT(*) as total_detections,
      COUNT(*) FILTER (WHERE blocked = true) as blocked_count,
      AVG(spam_score) as avg_spam_score
    FROM global_spam_detections
    WHERE detected_at >= NOW() - INTERVAL '24 hours'
  `
  const statsResult = await pool.query(statsQuery)

  return NextResponse.json({
    success: true,
    data: {
      detections: result.rows,
      statistics: statsResult.rows[0]
    }
  })
}

async function getDisposableEmails(searchParams: URLSearchParams) {
  const search = searchParams.get('search')
  const limit = parseInt(searchParams.get('limit') || '100')

  let query: string
  let params: any[]

  if (search) {
    query = `
      SELECT * FROM disposable_email_domains
      WHERE domain ILIKE $1
      ORDER BY domain
      LIMIT $2
    `
    params = [`%${search}%`, limit]
  } else {
    query = `
      SELECT * FROM disposable_email_domains
      ORDER BY added_at DESC
      LIMIT $1
    `
    params = [limit]
  }

  const result = await pool.query(query, params)

  const countQuery = `SELECT COUNT(*) as total FROM disposable_email_domains`
  const countResult = await pool.query(countQuery)

  return NextResponse.json({
    success: true,
    data: {
      domains: result.rows,
      total: parseInt(countResult.rows[0].total)
    }
  })
}

// POST endpoints
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { endpoint, ...data } = body

    if (endpoint === 'pattern') {
      return await createPattern(data)
    } else if (endpoint === 'detection') {
      return await logDetection(data)
    } else if (endpoint === 'disposable-email') {
      return await addDisposableEmail(data)
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid endpoint'
    }, { status: 400 })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

async function createPattern(data: any) {
  const { pattern_name, pattern_type, pattern_value, is_regex, severity, category, action, description } = data

  const query = `
    INSERT INTO global_spam_patterns (
      pattern_name, pattern_type, pattern_value, is_regex, severity, category, action, description
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `

  const result = await pool.query(query, [
    pattern_name,
    pattern_type,
    pattern_value,
    is_regex || false,
    severity || 5,
    category || null,
    action || 'flag',
    description || null
  ])

  return NextResponse.json({
    success: true,
    data: result.rows[0],
    message: 'Pattern created successfully'
  })
}

async function logDetection(data: any) {
  const {
    ip, domain, form_type, content_hash, spam_score, matched_patterns,
    action, blocked, email, email_is_disposable, phone, contains_urls, url_count
  } = data

  const query = `
    INSERT INTO global_spam_detections (
      ip, domain, form_type, content_hash, spam_score, matched_patterns,
      action, blocked, email, email_is_disposable, phone, contains_urls, url_count
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *
  `

  const result = await pool.query(query, [
    ip, domain, form_type || null, content_hash || null, spam_score || 0,
    JSON.stringify(matched_patterns || []), action || 'flag', blocked || false,
    email || null, email_is_disposable || false, phone || null,
    contains_urls || false, url_count || 0
  ])

  // Update pattern statistics
  if (matched_patterns && Array.isArray(matched_patterns)) {
    for (const match of matched_patterns) {
      if (match.pattern_id) {
        await pool.query(`
          UPDATE global_spam_patterns
          SET matches_count = matches_count + 1, last_matched_at = NOW()
          WHERE id = $1
        `, [match.pattern_id])
      }
    }
  }

  return NextResponse.json({
    success: true,
    data: result.rows[0],
    message: 'Detection logged successfully'
  })
}

async function addDisposableEmail(data: any) {
  const { domain } = data

  if (!domain) {
    return NextResponse.json({
      success: false,
      error: 'Domain is required'
    }, { status: 400 })
  }

  const query = `
    INSERT INTO disposable_email_domains (domain)
    VALUES ($1)
    ON CONFLICT (domain) DO NOTHING
    RETURNING *
  `

  const result = await pool.query(query, [domain])

  return NextResponse.json({
    success: true,
    data: result.rows[0],
    message: 'Disposable email domain added'
  })
}

// DELETE endpoints
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get('endpoint')
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID is required'
      }, { status: 400 })
    }

    let query: string
    if (endpoint === 'pattern') {
      query = `DELETE FROM global_spam_patterns WHERE id = $1 RETURNING pattern_name`
    } else if (endpoint === 'disposable-email') {
      query = `DELETE FROM disposable_email_domains WHERE id = $1 RETURNING domain`
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid endpoint'
      }, { status: 400 })
    }

    const result = await pool.query(query, [id])

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Record not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Deleted successfully'
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
