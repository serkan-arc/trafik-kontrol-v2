import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

// GET - List notification history with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const eventType = searchParams.get('event_type')
    const severity = searchParams.get('severity')
    const ruleId = searchParams.get('rule_id')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit
    
    let query = `
      SELECT 
        nh.*,
        nr.rule_name,
        nc.channel_name,
        nc.channel_type
      FROM notification_history nh
      LEFT JOIN notification_rules nr ON nh.rule_id = nr.id
      LEFT JOIN notification_channels nc ON nh.channel_id = nc.id
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1
    
    if (status) {
      query += ` AND nh.status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }
    
    if (eventType) {
      query += ` AND nh.event_type = $${paramIndex}`
      params.push(eventType)
      paramIndex++
    }
    
    if (severity) {
      query += ` AND nh.severity = $${paramIndex}`
      params.push(severity)
      paramIndex++
    }
    
    if (ruleId) {
      query += ` AND nh.rule_id = $${paramIndex}`
      params.push(ruleId)
      paramIndex++
    }
    
    // Count total for pagination
    const countQuery = query.replace('SELECT nh.*, nr.rule_name, nc.channel_name, nc.channel_type', 'SELECT COUNT(*)')
    const countResult = await pool.query(countQuery, params)
    const total = parseInt(countResult.rows[0].count)
    
    // Add pagination
    query += ` ORDER BY nh.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(limit, offset)
    
    const result = await pool.query(query, params)
    
    // Calculate statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'throttled' THEN 1 END) as throttled
      FROM notification_history
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `
    const statsResult = await pool.query(statsQuery)
    
    return NextResponse.json({
      success: true,
      data: {
        notifications: result.rows,
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
    console.error('Error fetching notification history:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
