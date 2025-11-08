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

// GET: List all IP reputations with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const list_type = searchParams.get('list_type') // whitelist, graylist, blacklist, unknown
    const country = searchParams.get('country')
    const min_score = searchParams.get('min_score')
    const max_score = searchParams.get('max_score')
    const is_banned = searchParams.get('is_banned')
    const search = searchParams.get('search') // IP search
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    let whereConditions: string[] = []
    let queryParams: any[] = []
    let paramIndex = 1

    if (list_type) {
      whereConditions.push(`list_type = $${paramIndex}`)
      queryParams.push(list_type)
      paramIndex++
    }

    if (country) {
      whereConditions.push(`country = $${paramIndex}`)
      queryParams.push(country)
      paramIndex++
    }

    if (min_score) {
      whereConditions.push(`reputation_score >= $${paramIndex}`)
      queryParams.push(parseInt(min_score))
      paramIndex++
    }

    if (max_score) {
      whereConditions.push(`reputation_score <= $${paramIndex}`)
      queryParams.push(parseInt(max_score))
      paramIndex++
    }

    if (is_banned !== null && is_banned !== undefined) {
      whereConditions.push(`is_banned = $${paramIndex}`)
      queryParams.push(is_banned === 'true')
      paramIndex++
    }

    if (search) {
      whereConditions.push(`ip ILIKE $${paramIndex}`)
      queryParams.push(`%${search}%`)
      paramIndex++
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : ''

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM global_ip_reputation
      ${whereClause}
    `
    const countResult = await pool.query(countQuery, queryParams)
    const total = parseInt(countResult.rows[0].total)

    // Get paginated results
    const query = `
      SELECT 
        id, ip, reputation_score, list_type, auto_classified,
        classification_reason, country, city, isp, organization,
        is_vpn, is_proxy, is_tor, is_datacenter,
        total_requests, suspicious_requests, blocked_requests,
        spam_attempts, failed_challenges,
        domains_visited, first_seen_domain,
        first_seen_at, last_seen_at, last_updated_at,
        is_banned, ban_type, ban_expires_at, ban_reason, banned_at, banned_by,
        notes
      FROM global_ip_reputation
      ${whereClause}
      ORDER BY last_seen_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    queryParams.push(limit, offset)

    const result = await pool.query(query, queryParams)

    return NextResponse.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error: any) {
    console.error('Error fetching IP reputations:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// POST: Add or update IP reputation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      ip, 
      list_type, 
      reputation_score,
      ban_type,
      ban_expires_at,
      ban_reason,
      notes 
    } = body

    if (!ip) {
      return NextResponse.json({
        success: false,
        error: 'IP address is required'
      }, { status: 400 })
    }

    // Check if IP already exists
    const existingIp = await pool.query(
      'SELECT id FROM global_ip_reputation WHERE ip = $1',
      [ip]
    )

    let result
    if (existingIp.rows.length > 0) {
      // Update existing IP
      const updates: string[] = []
      const params: any[] = []
      let paramIndex = 1

      if (list_type) {
        updates.push(`list_type = $${paramIndex}`)
        params.push(list_type)
        paramIndex++
      }

      if (reputation_score !== undefined) {
        updates.push(`reputation_score = $${paramIndex}`)
        params.push(reputation_score)
        paramIndex++
      }

      if (ban_type !== undefined) {
        updates.push(`is_banned = $${paramIndex}`)
        params.push(ban_type !== null)
        paramIndex++
        
        updates.push(`ban_type = $${paramIndex}`)
        params.push(ban_type)
        paramIndex++

        if (ban_expires_at) {
          updates.push(`ban_expires_at = $${paramIndex}`)
          params.push(ban_expires_at)
          paramIndex++
        }

        if (ban_reason) {
          updates.push(`ban_reason = $${paramIndex}`)
          params.push(ban_reason)
          paramIndex++
        }

        updates.push(`banned_at = NOW()`)
        updates.push(`banned_by = $${paramIndex}`)
        params.push('manual')
        paramIndex++
      }

      if (notes !== undefined) {
        updates.push(`notes = $${paramIndex}`)
        params.push(notes)
        paramIndex++
      }

      updates.push(`last_updated_at = NOW()`)
      params.push(ip)

      const query = `
        UPDATE global_ip_reputation
        SET ${updates.join(', ')}
        WHERE ip = $${paramIndex}
        RETURNING *
      `

      result = await pool.query(query, params)
    } else {
      // Insert new IP
      const query = `
        INSERT INTO global_ip_reputation (
          ip, list_type, reputation_score, 
          is_banned, ban_type, ban_expires_at, ban_reason, banned_at, banned_by,
          notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `
      
      result = await pool.query(query, [
        ip,
        list_type || 'unknown',
        reputation_score || 50,
        ban_type !== null && ban_type !== undefined,
        ban_type || null,
        ban_expires_at || null,
        ban_reason || null,
        ban_type ? new Date() : null,
        ban_type ? 'manual' : null,
        notes || null
      ])
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: existingIp.rows.length > 0 ? 'IP updated' : 'IP added'
    })

  } catch (error: any) {
    console.error('Error managing IP reputation:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// DELETE: Remove IP from reputation database
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ip = searchParams.get('ip')

    if (!ip) {
      return NextResponse.json({
        success: false,
        error: 'IP address is required'
      }, { status: 400 })
    }

    const result = await pool.query(
      'DELETE FROM global_ip_reputation WHERE ip = $1 RETURNING ip',
      [ip]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'IP not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: `IP ${ip} removed from reputation database`
    })

  } catch (error: any) {
    console.error('Error deleting IP:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
