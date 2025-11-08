import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT - Update a bot pattern
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ domain: string; id: string }> }
) {
  try {
    const { domain, id } = await context.params
    const data = await request.json()
    
    // Get domain info
    const domainResult = await db.query(
      'SELECT * FROM master_domains WHERE domain = $1',
      [domain]
    )
    
    if (!domainResult.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Domain not found' },
        { status: 404 }
      )
    }
    
    const schema = domainResult.rows[0].db_schema
    
    // Update bot pattern
    const result = await db.query(`
      UPDATE "${schema}_bot_patterns"
      SET bot_name = $1, bot_type = $2, category = $3, 
          user_agent_patterns = $4, recommended_action = $5,
          vendor = $6, description = $7, verified = $8,
          updated_at = NOW()
      WHERE id = $9
      RETURNING *
    `, [
      data.bot_name,
      data.bot_type,
      data.category,
      data.user_agent_patterns || [],
      data.recommended_action,
      data.vendor,
      data.description,
      data.verified,
      id
    ])
    
    if (!result.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Bot pattern not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      pattern: result.rows[0]
    })
    
  } catch (error: any) {
    console.error('Error updating bot pattern:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// PATCH - Toggle enabled status
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ domain: string; id: string }> }
) {
  try {
    const { domain, id } = await context.params
    const { enabled } = await request.json()
    
    // Get domain info
    const domainResult = await db.query(
      'SELECT * FROM master_domains WHERE domain = $1',
      [domain]
    )
    
    if (!domainResult.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Domain not found' },
        { status: 404 }
      )
    }
    
    const schema = domainResult.rows[0].db_schema
    
    // Update enabled status
    const result = await db.query(`
      UPDATE "${schema}_bot_patterns"
      SET enabled = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [enabled, id])
    
    if (!result.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Bot pattern not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      pattern: result.rows[0]
    })
    
  } catch (error: any) {
    console.error('Error toggling bot pattern:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Delete a bot pattern
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ domain: string; id: string }> }
) {
  try {
    const { domain, id } = await context.params
    
    // Get domain info
    const domainResult = await db.query(
      'SELECT * FROM master_domains WHERE domain = $1',
      [domain]
    )
    
    if (!domainResult.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Domain not found' },
        { status: 404 }
      )
    }
    
    const schema = domainResult.rows[0].db_schema
    
    // Delete bot pattern
    const result = await db.query(`
      DELETE FROM "${schema}_bot_patterns"
      WHERE id = $1
      RETURNING id
    `, [id])
    
    if (!result.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Bot pattern not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Bot pattern deleted successfully'
    })
    
  } catch (error: any) {
    console.error('Error deleting bot pattern:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}