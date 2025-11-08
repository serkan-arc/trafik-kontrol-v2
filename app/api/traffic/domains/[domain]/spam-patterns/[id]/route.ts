import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT - Update a spam pattern
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
    
    // Update spam pattern
    const result = await db.query(`
      UPDATE "${schema}_spam_patterns"
      SET pattern_name = $1, pattern_type = $2, pattern_value = $3, 
          is_regex = $4, severity = $5, category = $6,
          action = $7, description = $8, enabled = $9,
          updated_at = NOW()
      WHERE id = $10
      RETURNING *
    `, [
      data.pattern_name,
      data.pattern_type,
      data.pattern_value,
      data.is_regex,
      data.severity,
      data.category,
      data.action,
      data.description,
      data.enabled,
      id
    ])
    
    if (!result.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Spam pattern not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      pattern: result.rows[0]
    })
    
  } catch (error: any) {
    console.error('Error updating spam pattern:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// PATCH - Toggle enabled status or update specific fields
export async function PATCH(
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
    
    // Build update query based on provided fields
    const updateFields = []
    const values = []
    let paramIndex = 1
    
    if ('enabled' in data) {
      updateFields.push(`enabled = $${paramIndex}`)
      values.push(data.enabled)
      paramIndex++
    }
    
    if ('severity' in data) {
      updateFields.push(`severity = $${paramIndex}`)
      values.push(data.severity)
      paramIndex++
    }
    
    if ('action' in data) {
      updateFields.push(`action = $${paramIndex}`)
      values.push(data.action)
      paramIndex++
    }
    
    updateFields.push(`updated_at = NOW()`)
    values.push(id)
    
    const query = `
      UPDATE "${schema}_spam_patterns"
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `
    
    const result = await db.query(query, values)
    
    if (!result.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Spam pattern not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      pattern: result.rows[0]
    })
    
  } catch (error: any) {
    console.error('Error patching spam pattern:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Delete a spam pattern
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
    
    // Delete spam pattern
    const result = await db.query(`
      DELETE FROM "${schema}_spam_patterns"
      WHERE id = $1
      RETURNING id, pattern_name
    `, [id])
    
    if (!result.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Spam pattern not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: `Spam pattern "${result.rows[0].pattern_name}" deleted successfully`
    })
    
  } catch (error: any) {
    console.error('Error deleting spam pattern:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}