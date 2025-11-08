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

// GET: Get IP activity across all domains
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ip = searchParams.get('ip')
    const domain = searchParams.get('domain')
    const hours = parseInt(searchParams.get('hours') || '24') // Last N hours
    const limit = parseInt(searchParams.get('limit') || '100')

    if (!ip && !domain) {
      return NextResponse.json({
        success: false,
        error: 'Either IP or domain parameter is required'
      }, { status: 400 })
    }

    let whereConditions: string[] = []
    let queryParams: any[] = []
    let paramIndex = 1

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

    whereConditions.push(`hour_timestamp > NOW() - INTERVAL '${hours} hours'`)

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`

    // Get activity data
    const query = `
      SELECT 
        ip, domain, hour_timestamp,
        request_count, suspicious_count, bot_score,
        triggered_rate_limit, triggered_rules,
        created_at, updated_at
      FROM global_ip_activity
      ${whereClause}
      ORDER BY hour_timestamp DESC
      LIMIT $${paramIndex}
    `
    queryParams.push(limit)

    const result = await pool.query(query, queryParams)

    // Get summary statistics
    const summaryQuery = `
      SELECT 
        COUNT(DISTINCT ip) as unique_ips,
        COUNT(DISTINCT domain) as domains_visited,
        SUM(request_count) as total_requests,
        SUM(suspicious_count) as total_suspicious,
        AVG(bot_score)::INTEGER as avg_bot_score,
        COUNT(*) FILTER (WHERE triggered_rate_limit = true) as rate_limit_triggers
      FROM global_ip_activity
      ${whereClause}
    `
    const summaryResult = await pool.query(summaryQuery, queryParams.slice(0, -1))

    return NextResponse.json({
      success: true,
      data: result.rows,
      summary: summaryResult.rows[0],
      filters: {
        ip,
        domain,
        hours,
        limit
      }
    })

  } catch (error: any) {
    console.error('Error fetching IP activity:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
