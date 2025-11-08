import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - List all bot patterns for a domain
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await context.params
    
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
    
    // Get bot patterns
    const patterns = await db.query(`
      SELECT * FROM "${schema}_bot_patterns"
      ORDER BY created_at DESC
    `).catch(() => ({ rows: [] }))
    
    return NextResponse.json({
      success: true,
      patterns: patterns.rows
    })
    
  } catch (error: any) {
    console.error('Error fetching bot patterns:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// POST - Create a new bot pattern
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await context.params
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
    
    // Insert bot pattern
    const result = await db.query(`
      INSERT INTO "${schema}_bot_patterns" 
      (bot_name, bot_type, category, user_agent_patterns, 
       recommended_action, vendor, description, verified, enabled)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      data.bot_name,
      data.bot_type || 'unknown',
      data.category,
      data.user_agent_patterns || [],
      data.recommended_action || 'monitor',
      data.vendor,
      data.description,
      data.verified || false,
      data.enabled !== false
    ])
    
    return NextResponse.json({
      success: true,
      pattern: result.rows[0]
    })
    
  } catch (error: any) {
    console.error('Error creating bot pattern:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}