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

// GET - List rule triggers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ruleId = searchParams.get('rule_id')
    const ip = searchParams.get('ip')
    const domain = searchParams.get('domain')
    const blocked = searchParams.get('blocked')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    let conditions: string[] = []
    let params: any[] = []
    let paramIndex = 1

    if (ruleId) {
      conditions.push(`rule_id = $${paramIndex}`)
      params.push(ruleId)
      paramIndex++
    }

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

    if (blocked !== null && blocked !== undefined) {
      conditions.push(`blocked = $${paramIndex}`)
      params.push(blocked === 'true')
      paramIndex++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Get count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM global_rule_triggers
      ${whereClause}
    `
    const countResult = await pool.query(countQuery, params)
    const total = parseInt(countResult.rows[0].total)

    // Get data
    params.push(limit, offset)
    const dataQuery = `
      SELECT 
        id,
        rule_id,
        rule_name,
        ip,
        domain,
        path,
        user_agent,
        action,
        blocked,
        triggered_at
      FROM global_rule_triggers
      ${whereClause}
      ORDER BY triggered_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `

    const dataResult = await pool.query(dataQuery, params)

    // Get statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_triggers,
        COUNT(*) FILTER (WHERE blocked = true) as blocked_count,
        COUNT(DISTINCT rule_id) as rules_triggered,
        COUNT(DISTINCT ip) as unique_ips,
        COUNT(DISTINCT domain) as domains_affected
      FROM global_rule_triggers
      WHERE triggered_at >= NOW() - INTERVAL '24 hours'
    `
    const statsResult = await pool.query(statsQuery)

    return NextResponse.json({
      success: true,
      data: {
        triggers: dataResult.rows,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        },
        statistics: statsResult.rows[0]
      }
    })
  } catch (error: any) {
    console.error('Error fetching triggers:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// POST - Log a rule trigger (used by nginx parser)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      rule_id,
      rule_name,
      ip,
      domain,
      path,
      user_agent,
      action,
      blocked
    } = body

    if (!rule_id || !ip || !domain) {
      return NextResponse.json({
        success: false,
        error: 'rule_id, ip, and domain are required'
      }, { status: 400 })
    }

    const query = `
      INSERT INTO global_rule_triggers (
        rule_id,
        rule_name,
        ip,
        domain,
        path,
        user_agent,
        action,
        blocked
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `

    const params = [
      rule_id,
      rule_name,
      ip,
      domain,
      path || null,
      user_agent || null,
      action,
      blocked || false
    ]

    const result = await pool.query(query, params)

    // Update rule statistics
    const updateRuleQuery = `
      UPDATE global_auto_rules
      SET 
        triggered_count = triggered_count + 1,
        last_triggered_at = NOW(),
        blocked_requests = blocked_requests + CASE WHEN $2 THEN 1 ELSE 0 END,
        challenged_requests = challenged_requests + CASE WHEN $3 = 'challenge' THEN 1 ELSE 0 END
      WHERE id = $1
    `
    await pool.query(updateRuleQuery, [rule_id, blocked, action])

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Trigger logged successfully'
    })
  } catch (error: any) {
    console.error('Error logging trigger:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
