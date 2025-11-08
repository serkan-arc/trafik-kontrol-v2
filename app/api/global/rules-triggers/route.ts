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

// GET: Get rule trigger logs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rule_id = searchParams.get('rule_id')
    const ip = searchParams.get('ip')
    const domain = searchParams.get('domain')
    const hours = parseInt(searchParams.get('hours') || '24')
    const limit = parseInt(searchParams.get('limit') || '100')

    let whereConditions: string[] = [`triggered_at > NOW() - INTERVAL '${hours} hours'`]
    let queryParams: any[] = []
    let paramIndex = 1

    if (rule_id) {
      whereConditions.push(`rule_id = $${paramIndex}`)
      queryParams.push(rule_id)
      paramIndex++
    }

    if (ip) {
      whereConditions.push(`ip = $${paramIndex}`)
      queryParams.push(ip)
      paramIndex++
    }

    if (domain) {
      whereConditions.push(`domain = $${paramIndex}`)
      queryParams.push(domain)
      paramIndex++
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`

    const query = `
      SELECT 
        id, rule_id, rule_name, ip, domain, path, user_agent,
        action, blocked, triggered_at
      FROM global_rule_triggers
      ${whereClause}
      ORDER BY triggered_at DESC
      LIMIT $${paramIndex}
    `
    queryParams.push(limit)

    const result = await pool.query(query, queryParams)

    // Get aggregated stats
    const statsQuery = `
      SELECT 
        COUNT(*) as total_triggers,
        COUNT(DISTINCT rule_id) as unique_rules,
        COUNT(DISTINCT ip) as unique_ips,
        COUNT(DISTINCT domain) as unique_domains,
        COUNT(*) FILTER (WHERE blocked = true) as blocked_count,
        COUNT(*) FILTER (WHERE action = 'challenge') as challenged_count
      FROM global_rule_triggers
      ${whereClause}
    `
    const statsResult = await pool.query(statsQuery, queryParams.slice(0, -1))

    // Get top triggered rules
    const topRulesQuery = `
      SELECT 
        rule_id, rule_name, COUNT(*) as trigger_count
      FROM global_rule_triggers
      ${whereClause}
      GROUP BY rule_id, rule_name
      ORDER BY trigger_count DESC
      LIMIT 10
    `
    const topRulesResult = await pool.query(topRulesQuery, queryParams.slice(0, -1))

    return NextResponse.json({
      success: true,
      data: result.rows,
      stats: statsResult.rows[0],
      top_rules: topRulesResult.rows
    })

  } catch (error: any) {
    console.error('Error fetching rule triggers:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
