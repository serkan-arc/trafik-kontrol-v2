import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - List bot detections for a domain
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await context.params
    const { searchParams } = new URL(request.url)
    
    // Filters
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const bot_type = searchParams.get('bot_type')
    const blocked = searchParams.get('blocked')
    
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
    
    // Build query
    let query = `
      SELECT * FROM "${schema}_bot_detections"
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1
    
    if (bot_type) {
      query += ` AND bot_type = $${paramIndex}`
      params.push(bot_type)
      paramIndex++
    }
    
    if (blocked !== null && blocked !== undefined) {
      query += ` AND blocked = $${paramIndex}`
      params.push(blocked === 'true')
      paramIndex++
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(limit, offset)
    
    // Get detections
    const detections = await db.query(query, params).catch(() => ({ rows: [] }))
    
    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM "${schema}_bot_detections" WHERE 1=1`
    const countParams: any[] = []
    let countParamIndex = 1
    
    if (bot_type) {
      countQuery += ` AND bot_type = $${countParamIndex}`
      countParams.push(bot_type)
      countParamIndex++
    }
    
    if (blocked !== null && blocked !== undefined) {
      countQuery += ` AND blocked = $${countParamIndex}`
      countParams.push(blocked === 'true')
    }
    
    const countResult = await db.query(countQuery, countParams)
      .catch(() => ({ rows: [{ total: 0 }] }))
    
    return NextResponse.json({
      success: true,
      detections: detections.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit,
        offset
      }
    })
    
  } catch (error: any) {
    console.error('Error fetching bot detections:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// POST - Log a bot detection
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
    
    // Check if bot pattern exists
    let bot_type = 'unknown'
    let recommended_action = 'monitor'
    let is_fake = false
    
    if (data.user_agent) {
      // Try to match against existing patterns
      const patterns = await db.query(`
        SELECT * FROM "${schema}_bot_patterns"
        WHERE enabled = true
      `).catch(() => ({ rows: [] }))
      
      for (const pattern of patterns.rows) {
        const userAgentPatterns = pattern.user_agent_patterns || []
        for (const uaPattern of userAgentPatterns) {
          if (data.user_agent.toLowerCase().includes(uaPattern.toLowerCase())) {
            bot_type = pattern.bot_type
            recommended_action = pattern.recommended_action
            data.bot_name = data.bot_name || pattern.bot_name
            
            // Update pattern detection count
            await db.query(`
              UPDATE "${schema}_bot_patterns"
              SET detection_count = detection_count + 1,
                  last_detected_at = NOW()
              WHERE id = $1
            `, [pattern.id]).catch(() => {})
            
            break
          }
        }
        if (bot_type !== 'unknown') break
      }
    }
    
    // Determine action based on bot type
    const blocked = recommended_action === 'block' || (bot_type === 'bad' && recommended_action !== 'allow')
    const action_taken = blocked ? 'blocked' : recommended_action
    
    // Insert detection
    const result = await db.query(`
      INSERT INTO "${schema}_bot_detections" 
      (ip_address, user_agent, bot_name, bot_type, detection_method, 
       is_fake, confidence_score, action_taken, blocked)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      data.ip_address,
      data.user_agent,
      data.bot_name || 'Unknown Bot',
      bot_type,
      data.detection_method || 'user_agent',
      is_fake,
      data.confidence_score || 0.5,
      action_taken,
      blocked
    ])
    
    return NextResponse.json({
      success: true,
      detection: result.rows[0],
      action: action_taken
    })
    
  } catch (error: any) {
    console.error('Error logging bot detection:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}