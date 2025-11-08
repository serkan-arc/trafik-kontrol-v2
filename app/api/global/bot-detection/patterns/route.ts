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

// GET - List bot patterns
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const botType = searchParams.get('bot_type')
    const enabled = searchParams.get('enabled')
    const verified = searchParams.get('verified')

    let conditions: string[] = []
    let params: any[] = []
    let paramIndex = 1

    if (botType) {
      conditions.push(`bot_type = $${paramIndex}`)
      params.push(botType)
      paramIndex++
    }

    if (enabled !== null && enabled !== undefined) {
      conditions.push(`enabled = $${paramIndex}`)
      params.push(enabled === 'true')
      paramIndex++
    }

    if (verified !== null && verified !== undefined) {
      conditions.push(`verified = $${paramIndex}`)
      params.push(verified === 'true')
      paramIndex++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const query = `
      SELECT 
        id,
        bot_name,
        bot_type,
        category,
        user_agent_patterns,
        ip_ranges,
        behavior_signatures,
        recommended_action,
        vendor,
        description,
        verified,
        detection_count,
        last_detected_at,
        enabled,
        created_at,
        updated_at
      FROM global_bot_patterns
      ${whereClause}
      ORDER BY bot_type, bot_name
    `

    const result = await pool.query(query, params)

    // Get statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_patterns,
        COUNT(*) FILTER (WHERE bot_type = 'good') as good_bots,
        COUNT(*) FILTER (WHERE bot_type = 'bad') as bad_bots,
        COUNT(*) FILTER (WHERE verified = true) as verified_patterns,
        COUNT(*) FILTER (WHERE enabled = true) as enabled_patterns
      FROM global_bot_patterns
    `
    const statsResult = await pool.query(statsQuery)

    return NextResponse.json({
      success: true,
      data: {
        patterns: result.rows,
        statistics: statsResult.rows[0]
      }
    })
  } catch (error: any) {
    console.error('Error fetching bot patterns:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// POST - Create bot pattern
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      bot_name,
      bot_type,
      category,
      user_agent_patterns,
      ip_ranges,
      behavior_signatures,
      recommended_action,
      vendor,
      description,
      verified
    } = body

    if (!bot_name || !bot_type || !user_agent_patterns) {
      return NextResponse.json({
        success: false,
        error: 'bot_name, bot_type, and user_agent_patterns are required'
      }, { status: 400 })
    }

    const query = `
      INSERT INTO global_bot_patterns (
        bot_name,
        bot_type,
        category,
        user_agent_patterns,
        ip_ranges,
        behavior_signatures,
        recommended_action,
        vendor,
        description,
        verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `

    const params = [
      bot_name,
      bot_type,
      category || null,
      Array.isArray(user_agent_patterns) ? user_agent_patterns : [user_agent_patterns],
      ip_ranges || null,
      JSON.stringify(behavior_signatures || {}),
      recommended_action || 'monitor',
      vendor || null,
      description || null,
      verified || false
    ]

    const result = await pool.query(query, params)

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Bot pattern created successfully'
    })
  } catch (error: any) {
    console.error('Error creating bot pattern:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// PUT - Update bot pattern
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Pattern ID is required'
      }, { status: 400 })
    }

    const allowedFields = [
      'bot_name', 'bot_type', 'category', 'user_agent_patterns', 'ip_ranges',
      'behavior_signatures', 'recommended_action', 'vendor', 'description', 'verified', 'enabled'
    ]

    const updateFields: string[] = []
    const params: any[] = []
    let paramIndex = 1

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = $${paramIndex}`)
        if (key === 'behavior_signatures') {
          params.push(JSON.stringify(value))
        } else {
          params.push(value)
        }
        paramIndex++
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid fields to update'
      }, { status: 400 })
    }

    updateFields.push(`updated_at = NOW()`)
    params.push(id)

    const query = `
      UPDATE global_bot_patterns
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `

    const result = await pool.query(query, params)

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Pattern not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Bot pattern updated successfully'
    })
  } catch (error: any) {
    console.error('Error updating bot pattern:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// DELETE - Delete bot pattern
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Pattern ID is required'
      }, { status: 400 })
    }

    const query = `
      DELETE FROM global_bot_patterns
      WHERE id = $1
      RETURNING bot_name
    `

    const result = await pool.query(query, [id])

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Pattern not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: `Pattern "${result.rows[0].bot_name}" deleted successfully`
    })
  } catch (error: any) {
    console.error('Error deleting bot pattern:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
