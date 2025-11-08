import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PATCH - Toggle enable/disable an auto rule
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
    
    // Toggle rule enabled status
    const result = await db.query(`
      UPDATE "${schema}_auto_rules"
      SET 
        enabled = $2,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id, enabled])
    
    if (!result.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Auto rule not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      rule: result.rows[0]
    })
    
  } catch (error: any) {
    console.error('Error toggling auto rule:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Delete an auto rule
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
    
    // Delete auto rule
    const result = await db.query(`
      DELETE FROM "${schema}_auto_rules"
      WHERE id = $1
      RETURNING *
    `, [id])
    
    if (!result.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Auto rule not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Auto rule deleted successfully',
      rule: result.rows[0]
    })
    
  } catch (error: any) {
    console.error('Error deleting auto rule:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}