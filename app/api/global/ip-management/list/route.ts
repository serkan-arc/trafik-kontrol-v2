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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Filters
    const listType = searchParams.get('list_type') // whitelist, graylist, blacklist, unknown
    const country = searchParams.get('country')
    const isBanned = searchParams.get('is_banned')
    const minScore = searchParams.get('min_score')
    const maxScore = searchParams.get('max_score')
    const search = searchParams.get('search') // IP search
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit
    
    // Sorting
    const sortBy = searchParams.get('sort_by') || 'last_seen_at'
    const sortOrder = searchParams.get('sort_order') || 'DESC'

    // Build query
    let conditions: string[] = []
    let params: any[] = []
    let paramIndex = 1

    if (listType) {
      conditions.push(`list_type = $${paramIndex}`)
      params.push(listType)
      paramIndex++
    }

    if (country) {
      conditions.push(`country = $${paramIndex}`)
      params.push(country)
      paramIndex++
    }

    if (isBanned !== null && isBanned !== undefined) {
      conditions.push(`is_banned = $${paramIndex}`)
      params.push(isBanned === 'true')
      paramIndex++
    }

    if (minScore) {
      conditions.push(`reputation_score >= $${paramIndex}`)
      params.push(parseInt(minScore))
      paramIndex++
    }

    if (maxScore) {
      conditions.push(`reputation_score <= $${paramIndex}`)
      params.push(parseInt(maxScore))
      paramIndex++
    }

    if (search) {
      conditions.push(`ip ILIKE $${paramIndex}`)
      params.push(`%${search}%`)
      paramIndex++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM global_ip_reputation
      ${whereClause}
    `
    const countResult = await pool.query(countQuery, params)
    const total = parseInt(countResult.rows[0].total)

    // Get paginated data
    const dataQuery = `
      SELECT 
        ip,
        reputation_score,
        list_type,
        country,
        city,
        isp,
        organization,
        is_vpn,
        is_proxy,
        is_tor,
        is_datacenter,
        total_requests,
        suspicious_requests,
        blocked_requests,
        spam_attempts,
        failed_challenges,
        domains_visited,
        first_seen_at,
        last_seen_at,
        is_banned,
        ban_type,
        ban_expires_at,
        ban_reason
      FROM global_ip_reputation
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    params.push(limit, offset)
    
    const dataResult = await pool.query(dataQuery, params)

    // Calculate statistics
    const statsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE list_type = 'whitelist') as whitelist_count,
        COUNT(*) FILTER (WHERE list_type = 'blacklist') as blacklist_count,
        COUNT(*) FILTER (WHERE list_type = 'graylist') as graylist_count,
        COUNT(*) FILTER (WHERE is_banned = true) as banned_count,
        COUNT(*) FILTER (WHERE reputation_score >= 70) as high_risk_count,
        AVG(reputation_score) as avg_reputation_score
      FROM global_ip_reputation
    `
    const statsResult = await pool.query(statsQuery)

    return NextResponse.json({
      success: true,
      data: {
        ips: dataResult.rows,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit)
        },
        statistics: statsResult.rows[0]
      }
    })

  } catch (error: any) {
    console.error('Error fetching IP list:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
