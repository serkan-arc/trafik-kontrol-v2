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

// GET - List bot detections
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ip = searchParams.get('ip')
    const domain = searchParams.get('domain')
    const botType = searchParams.get('bot_type')
    const blocked = searchParams.get('blocked')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

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

    if (botType) {
      conditions.push(`bot_type = $${paramIndex}`)
      params.push(botType)
      paramIndex++
    }

    if (blocked !== null && blocked !== undefined) {
      conditions.push(`blocked = $${paramIndex}`)
      params.push(blocked === 'true')
      paramIndex++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Get count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM global_bot_detections
      ${whereClause}
    `
    const countResult = await pool.query(countQuery, params)
    const total = parseInt(countResult.rows[0].total)

    // Get data
    params.push(limit, offset)
    const dataQuery = `
      SELECT 
        id,
        ip,
        domain,
        user_agent,
        is_bot,
        bot_name,
        bot_type,
        bot_score,
        detection_method,
        matched_pattern_id,
        action,
        blocked,
        detected_at
      FROM global_bot_detections
      ${whereClause}
      ORDER BY detected_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `

    const dataResult = await pool.query(dataQuery, params)

    // Get statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_detections,
        COUNT(*) FILTER (WHERE is_bot = true) as confirmed_bots,
        COUNT(*) FILTER (WHERE bot_type = 'good') as good_bots,
        COUNT(*) FILTER (WHERE bot_type = 'bad') as bad_bots,
        COUNT(*) FILTER (WHERE blocked = true) as blocked_count,
        AVG(bot_score) as avg_bot_score
      FROM global_bot_detections
      WHERE detected_at >= NOW() - INTERVAL '24 hours'
    `
    const statsResult = await pool.query(statsQuery)

    // Get top detected bots
    const topBotsQuery = `
      SELECT 
        bot_name,
        bot_type,
        COUNT(*) as detection_count
      FROM global_bot_detections
      WHERE bot_name IS NOT NULL
        AND detected_at >= NOW() - INTERVAL '24 hours'
      GROUP BY bot_name, bot_type
      ORDER BY detection_count DESC
      LIMIT 10
    `
    const topBotsResult = await pool.query(topBotsQuery)

    return NextResponse.json({
      success: true,
      data: {
        detections: dataResult.rows,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        },
        statistics: statsResult.rows[0],
        top_bots: topBotsResult.rows
      }
    })
  } catch (error: any) {
    console.error('Error fetching bot detections:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// POST - Log bot detection (used by nginx parser)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      ip,
      domain,
      user_agent,
      is_bot,
      bot_name,
      bot_type,
      bot_score,
      detection_method,
      matched_pattern_id,
      action,
      blocked
    } = body

    if (!ip || !domain) {
      return NextResponse.json({
        success: false,
        error: 'ip and domain are required'
      }, { status: 400 })
    }

    const query = `
      INSERT INTO global_bot_detections (
        ip,
        domain,
        user_agent,
        is_bot,
        bot_name,
        bot_type,
        bot_score,
        detection_method,
        matched_pattern_id,
        action,
        blocked
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `

    const params = [
      ip,
      domain,
      user_agent || null,
      is_bot || false,
      bot_name || null,
      bot_type || 'unknown',
      bot_score || 0,
      detection_method || null,
      matched_pattern_id || null,
      action || 'allow',
      blocked || false
    ]

    const result = await pool.query(query, params)

    // Update pattern statistics if matched
    if (matched_pattern_id) {
      const updatePatternQuery = `
        UPDATE global_bot_patterns
        SET 
          detection_count = detection_count + 1,
          last_detected_at = NOW()
        WHERE id = $1
      `
      await pool.query(updatePatternQuery, [matched_pattern_id])
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Detection logged successfully'
    })
  } catch (error: any) {
    console.error('Error logging detection:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
