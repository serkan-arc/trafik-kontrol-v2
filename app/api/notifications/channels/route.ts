import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

// GET - List all notification channels
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const channelType = searchParams.get('channel_type')
    const enabled = searchParams.get('enabled')
    
    let query = 'SELECT * FROM notification_channels WHERE 1=1'
    const params: any[] = []
    let paramIndex = 1
    
    if (channelType) {
      query += ` AND channel_type = $${paramIndex}`
      params.push(channelType)
      paramIndex++
    }
    
    if (enabled !== null && enabled !== undefined) {
      query += ` AND enabled = $${paramIndex}`
      params.push(enabled === 'true')
      paramIndex++
    }
    
    query += ' ORDER BY created_at DESC'
    
    const result = await pool.query(query, params)
    
    // Mask sensitive data in config
    const channels = result.rows.map(channel => ({
      ...channel,
      config: {
        ...channel.config,
        smtp_password: channel.config.smtp_password ? '***' : undefined,
        auth_token: channel.config.auth_token ? '***' : undefined
      }
    }))
    
    return NextResponse.json({
      success: true,
      data: channels
    })
  } catch (error: any) {
    console.error('Error fetching notification channels:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// POST - Create new notification channel
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { channel_name, channel_type, config, enabled } = body
    
    // Validation
    if (!channel_name || !channel_type || !config) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: channel_name, channel_type, config' },
        { status: 400 }
      )
    }
    
    const validTypes = ['email', 'slack', 'webhook', 'telegram', 'sms']
    if (!validTypes.includes(channel_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid channel_type' },
        { status: 400 }
      )
    }
    
    const query = `
      INSERT INTO notification_channels 
      (channel_name, channel_type, config, enabled)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `
    
    const result = await pool.query(query, [
      channel_name,
      channel_type,
      JSON.stringify(config),
      enabled !== undefined ? enabled : true
    ])
    
    return NextResponse.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error: any) {
    console.error('Error creating notification channel:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// PUT - Update notification channel
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Channel ID is required' },
        { status: 400 }
      )
    }
    
    // Build update query dynamically
    const allowedFields = ['channel_name', 'channel_type', 'config', 'enabled']
    const updateFields: string[] = []
    const params: any[] = []
    let paramIndex = 1
    
    Object.entries(updates).forEach(([key, value]) => {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = $${paramIndex}`)
        params.push(key === 'config' ? JSON.stringify(value) : value)
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
      UPDATE notification_channels 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `
    
    const result = await pool.query(query, params)
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Channel not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error: any) {
    console.error('Error updating notification channel:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Delete notification channel
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Channel ID is required' },
        { status: 400 }
      )
    }
    
    const result = await pool.query(
      'DELETE FROM notification_channels WHERE id = $1 RETURNING *',
      [id]
    )
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Channel not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Channel deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting notification channel:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
