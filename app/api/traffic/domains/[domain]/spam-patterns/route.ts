import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - List all spam patterns for a domain
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
    
    // Get spam patterns
    const patterns = await db.query(`
      SELECT * FROM "${schema}_spam_patterns"
      ORDER BY severity DESC, created_at DESC
    `).catch(() => ({ rows: [] }))
    
    // Get statistics
    const stats = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE enabled = true) as enabled_count,
        COUNT(*) FILTER (WHERE severity >= 8) as high_severity_count,
        SUM(matches_count) as total_matches,
        SUM(false_positive_count) as total_false_positives
      FROM "${schema}_spam_patterns"
    `).catch(() => ({ 
      rows: [{ 
        enabled_count: 0, 
        high_severity_count: 0, 
        total_matches: 0, 
        total_false_positives: 0 
      }] 
    }))
    
    return NextResponse.json({
      success: true,
      patterns: patterns.rows,
      statistics: stats.rows[0]
    })
    
  } catch (error: any) {
    console.error('Error fetching spam patterns:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// POST - Create a new spam pattern
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
    
    // Insert spam pattern
    const result = await db.query(`
      INSERT INTO "${schema}_spam_patterns" 
      (pattern_name, pattern_type, pattern_value, is_regex, 
       severity, category, action, description, enabled)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      data.pattern_name,
      data.pattern_type || 'keyword',
      data.pattern_value,
      data.is_regex || false,
      data.severity || 5,
      data.category || 'general',
      data.action || 'flag',
      data.description,
      data.enabled !== false
    ])
    
    return NextResponse.json({
      success: true,
      pattern: result.rows[0]
    })
    
  } catch (error: any) {
    console.error('Error creating spam pattern:', error)
    
    // Check for duplicate pattern
    if (error.message?.includes('duplicate key')) {
      return NextResponse.json(
        { success: false, error: 'Pattern with this name already exists' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}