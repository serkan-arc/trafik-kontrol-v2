import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - List all notification rules
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const enabled = searchParams.get('enabled')
    
    let query = 'SELECT * FROM notification_rules WHERE 1=1'
    const params: any[] = []
    let paramIndex = 1
    
    if (enabled !== null && enabled !== undefined) {
      query += ` AND enabled = $${paramIndex}`
      params.push(enabled === 'true')
      paramIndex++
    }
    
    query += ' ORDER BY priority DESC, created_at DESC'
    
    const result = await db.query(query, params)
    
    return NextResponse.json({
      success: true,
      data: result.rows
    })
  } catch (error: any) {
    console.error('Error fetching notification rules:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// POST - Create new notification rule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      rule_name,
      description,
      event_types,
      min_severity,
      affected_domains,
      specific_ips,
      throttle_enabled,
      throttle_window_minutes,
      throttle_max_per_window,
      recipient_emails,
      channel_ids,
      priority,
      enabled
    } = body
    
    // Validation
    if (!rule_name || !event_types || !Array.isArray(event_types) || event_types.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: rule_name, event_types (array)' },
        { status: 400 }
      )
    }
    
    const query = `
      INSERT INTO notification_rules 
      (rule_name, description, event_types, min_severity, affected_domains, specific_ips,
       throttle_enabled, throttle_window_minutes, throttle_max_per_window,
       recipient_emails, channel_ids, priority, enabled)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `
    
    const result = await db.query(query, [
      rule_name,
      description,
      event_types,
      min_severity || 'medium',
      affected_domains || [],
      specific_ips || [],
      throttle_enabled !== undefined ? throttle_enabled : true,
      throttle_window_minutes || 60,
      throttle_max_per_window || 5,
      recipient_emails || [],
      channel_ids || [],
      priority || 0,
      enabled !== undefined ? enabled : true
    ])
    
    return NextResponse.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error: any) {
    console.error('Error creating notification rule:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// PUT - Update notification rule
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Rule ID is required' },
        { status: 400 }
      )
    }
    
    // Build update query dynamically
    const allowedFields = [
      'rule_name', 'description', 'event_types', 'min_severity',
      'affected_domains', 'specific_ips', 'throttle_enabled',
      'throttle_window_minutes', 'throttle_max_per_window',
      'recipient_emails', 'channel_ids', 'priority', 'enabled'
    ]
    
    const updateFields: string[] = []
    const params: any[] = []
    let paramIndex = 1
    
    Object.entries(updates).forEach(([key, value]) => {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = $${paramIndex}`)
        params.push(value)
        paramIndex++
      }
    })
    
    if (updateFields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      )
    }
    
    updateFields.push(`updated_at = NOW()`)
    params.push(id)
    
    const query = `
      UPDATE notification_rules 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `
    
    const result = await db.query(query, params)
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Rule not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error: any) {
    console.error('Error updating notification rule:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Delete notification rule
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Rule ID is required' },
        { status: 400 }
      )
    }
    
    const result = await db.query(
      'DELETE FROM notification_rules WHERE id = $1 RETURNING *',
      [id]
    )
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Rule not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Rule deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting notification rule:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
