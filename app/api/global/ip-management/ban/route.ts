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

// Ban an IP
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ip, ban_type, duration_hours, reason, banned_by } = body

    if (!ip) {
      return NextResponse.json({
        success: false,
        error: 'IP address is required'
      }, { status: 400 })
    }

    if (!ban_type || !['permanent', 'temporary'].includes(ban_type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid ban_type. Must be "permanent" or "temporary"'
      }, { status: 400 })
    }

    if (ban_type === 'temporary' && !duration_hours) {
      return NextResponse.json({
        success: false,
        error: 'duration_hours is required for temporary bans'
      }, { status: 400 })
    }

    // Calculate ban expiration
    let banExpiresAt = null
    if (ban_type === 'temporary' && duration_hours) {
      const now = new Date()
      banExpiresAt = new Date(now.getTime() + duration_hours * 60 * 60 * 1000)
    }

    // Check if IP exists
    const checkQuery = `SELECT id FROM global_ip_reputation WHERE ip = $1`
    const checkResult = await pool.query(checkQuery, [ip])

    let query: string
    let params: any[]

    if (checkResult.rows.length === 0) {
      // Create new IP record with ban
      query = `
        INSERT INTO global_ip_reputation (
          ip,
          list_type,
          reputation_score,
          is_banned,
          ban_type,
          ban_expires_at,
          ban_reason,
          banned_at,
          banned_by,
          first_seen_at,
          last_seen_at,
          last_updated_at
        ) VALUES ($1, 'blacklist', 100, true, $2, $3, $4, NOW(), $5, NOW(), NOW(), NOW())
        RETURNING *
      `
      params = [ip, ban_type, banExpiresAt, reason || 'Manual ban', banned_by || 'admin']
    } else {
      // Update existing IP with ban
      query = `
        UPDATE global_ip_reputation
        SET 
          is_banned = true,
          ban_type = $2,
          ban_expires_at = $3,
          ban_reason = $4,
          banned_at = NOW(),
          banned_by = $5,
          list_type = 'blacklist',
          reputation_score = GREATEST(reputation_score, 80),
          last_updated_at = NOW()
        WHERE ip = $1
        RETURNING *
      `
      params = [ip, ban_type, banExpiresAt, reason || 'Manual ban', banned_by || 'admin']
    }

    const result = await pool.query(query, params)

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: `IP ${ip} banned successfully (${ban_type})`
    })

  } catch (error: any) {
    console.error('Error banning IP:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// Unban an IP
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

    const query = `
      UPDATE global_ip_reputation
      SET 
        is_banned = false,
        ban_type = NULL,
        ban_expires_at = NULL,
        ban_reason = NULL,
        list_type = CASE 
          WHEN reputation_score < 30 THEN 'whitelist'
          WHEN reputation_score >= 70 THEN 'graylist'
          ELSE 'unknown'
        END,
        last_updated_at = NOW()
      WHERE ip = $1
      RETURNING *
    `

    const result = await pool.query(query, [ip])

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'IP not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: `IP ${ip} unbanned successfully`
    })

  } catch (error: any) {
    console.error('Error unbanning IP:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// Check and cleanup expired bans (can be called periodically)
export async function GET(request: NextRequest) {
  try {
    const query = `
      UPDATE global_ip_reputation
      SET 
        is_banned = false,
        ban_type = NULL,
        ban_expires_at = NULL,
        list_type = 'graylist',
        last_updated_at = NOW()
      WHERE is_banned = true
        AND ban_type = 'temporary'
        AND ban_expires_at <= NOW()
      RETURNING ip, ban_reason, ban_expires_at
    `

    const result = await pool.query(query)

    return NextResponse.json({
      success: true,
      data: {
        expired_bans: result.rows,
        count: result.rows.length
      },
      message: `${result.rows.length} expired bans cleaned up`
    })

  } catch (error: any) {
    console.error('Error cleaning up expired bans:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// Bulk ban IPs
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { ips, ban_type, duration_hours, reason, banned_by } = body

    if (!ips || !Array.isArray(ips) || ips.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'IP array is required'
      }, { status: 400 })
    }

    if (!ban_type || !['permanent', 'temporary'].includes(ban_type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid ban_type'
      }, { status: 400 })
    }

    let banExpiresAt = null
    if (ban_type === 'temporary' && duration_hours) {
      const now = new Date()
      banExpiresAt = new Date(now.getTime() + duration_hours * 60 * 60 * 1000)
    }

    const query = `
      UPDATE global_ip_reputation
      SET 
        is_banned = true,
        ban_type = $1,
        ban_expires_at = $2,
        ban_reason = $3,
        banned_at = NOW(),
        banned_by = $4,
        list_type = 'blacklist',
        reputation_score = GREATEST(reputation_score, 80),
        last_updated_at = NOW()
      WHERE ip = ANY($5)
      RETURNING ip, is_banned, ban_type
    `

    const result = await pool.query(query, [
      ban_type,
      banExpiresAt,
      reason || 'Bulk ban',
      banned_by || 'admin',
      ips
    ])

    return NextResponse.json({
      success: true,
      data: {
        banned_count: result.rows.length,
        banned_ips: result.rows
      },
      message: `${result.rows.length} IPs banned successfully`
    })

  } catch (error: any) {
    console.error('Error bulk banning IPs:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
