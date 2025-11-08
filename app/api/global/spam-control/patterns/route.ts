import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

// GET - List all spam patterns with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const patternType = searchParams.get('pattern_type')
    const category = searchParams.get('category')
    const enabled = searchParams.get('enabled')
    const severity = searchParams.get('severity')
    
    let query = 'SELECT * FROM global_spam_patterns WHERE 1=1'
    const params: any[] = []
    let paramIndex = 1
    
    if (patternType) {
      query += ` AND pattern_type = $${paramIndex}`
      params.push(patternType)
      paramIndex++
    }
    
    if (category) {
      query += ` AND category = $${paramIndex}`
      params.push(category)
      paramIndex++
    }
    
    if (enabled !== null && enabled !== undefined) {
      query += ` AND enabled = $${paramIndex}`
      params.push(enabled === 'true')
      paramIndex++
    }
    
    if (severity) {
      query += ` AND severity >= $${paramIndex}`
      params.push(parseInt(severity))
      paramIndex++
    }
    
    query += ' ORDER BY severity DESC, created_at DESC'
    
    const result = await pool.query(query, params)
    
    // Calculate statistics
    const stats = {
      total: result.rows.length,
      enabled: result.rows.filter(p => p.enabled).length,
      disabled: result.rows.filter(p => !p.enabled).length,
      by_type: {} as Record<string, number>,
      by_severity: {} as Record<string, number>,
      total_matches: result.rows.reduce((sum, p) => sum + (p.matches_count || 0), 0)
    }
    
    // Group by type
    result.rows.forEach(pattern => {
      stats.by_type[pattern.pattern_type] = (stats.by_type[pattern.pattern_type] || 0) + 1
      const severityKey = pattern.severity >= 7 ? 'high' : pattern.severity >= 4 ? 'medium' : 'low'
      stats.by_severity[severityKey] = (stats.by_severity[severityKey] || 0) + 1
    })
    
    return NextResponse.json({
      success: true,
      data: {
        patterns: result.rows,
        statistics: stats
      }
    })
  } catch (error: any) {
    console.error('Error fetching spam patterns:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// POST - Create new spam pattern
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      pattern_name,
      pattern_type,
      pattern_value,
      is_regex,
      severity,
      category,
      action,
      description,
      source
    } = body
    
    // Validation
    if (!pattern_name || !pattern_type || !pattern_value) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: pattern_name, pattern_type, pattern_value' },
        { status: 400 }
      )
    }
    
    const validTypes = ['keyword', 'email_domain', 'url_pattern', 'content_hash', 'behavior']
    if (!validTypes.includes(pattern_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid pattern_type' },
        { status: 400 }
      )
    }
    
    const validActions = ['flag', 'block', 'quarantine', 'log_only']
    if (action && !validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      )
    }
    
    const query = `
      INSERT INTO global_spam_patterns 
      (pattern_name, pattern_type, pattern_value, is_regex, severity, category, action, description, source)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `
    
    const result = await pool.query(query, [
      pattern_name,
      pattern_type,
      pattern_value,
      is_regex || false,
      severity || 5,
      category,
      action || 'flag',
      description,
      source || 'manual'
    ])
    
    return NextResponse.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error: any) {
    console.error('Error creating spam pattern:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// PUT - Update spam pattern
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Pattern ID is required' },
        { status: 400 }
      )
    }
    
    // Build update query dynamically
    const allowedFields = [
      'pattern_name', 'pattern_type', 'pattern_value', 'is_regex',
      'severity', 'category', 'action', 'description', 'source', 'enabled'
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
    
    // Add updated_at
    updateFields.push(`updated_at = NOW()`)
    
    // Add id as last parameter
    params.push(id)
    
    const query = `
      UPDATE global_spam_patterns 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `
    
    const result = await pool.query(query, params)
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Pattern not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error: any) {
    console.error('Error updating spam pattern:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Delete spam pattern
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Pattern ID is required' },
        { status: 400 }
      )
    }
    
    const result = await pool.query(
      'DELETE FROM global_spam_patterns WHERE id = $1 RETURNING *',
      [id]
    )
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Pattern not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Pattern deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting spam pattern:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
