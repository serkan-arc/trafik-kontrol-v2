import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Get a specific rate limit rule
export async function GET(
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
    
    // Get rate limit rule
    const result = await db.query(`
      SELECT * FROM "${schema}_rate_limit_rules"
      WHERE id = $1
    `, [id])
    
    if (!result.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Rate limit rule not found' },
        { status: 404 }
      )
    }
    
    // Get statistics for the rule
    const statsResult = await db.query(`
      SELECT 
        COUNT(*) as total_blocked,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as blocked_24h,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as blocked_1h,
        COUNT(DISTINCT ip_address) as unique_ips
      FROM "${schema}_rate_limit_logs"
      WHERE rule_id = $1
    `, [id]).catch(() => ({ 
      rows: [{ 
        total_blocked: 0, 
        blocked_24h: 0, 
        blocked_1h: 0, 
        unique_ips: 0 
      }] 
    }))
    
    // Get recent blocks
    const recentBlocks = await db.query(`
      SELECT 
        ip_address,
        path,
        method,
        user_agent,
        blocked_at
      FROM "${schema}_rate_limit_logs"
      WHERE rule_id = $1
      ORDER BY blocked_at DESC
      LIMIT 10
    `, [id]).catch(() => ({ rows: [] }))
    
    return NextResponse.json({
      success: true,
      rule: {
        ...result.rows[0],
        statistics: statsResult.rows[0],
        recent_blocks: recentBlocks.rows
      }
    })
    
  } catch (error: any) {
    console.error('Error fetching rate limit rule:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// PUT - Update a rate limit rule
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
    
    // Update rate limit rule
    const result = await db.query(`
      UPDATE "${schema}_rate_limit_rules"
      SET 
        rule_name = COALESCE($2, rule_name),
        path_pattern = COALESCE($3, path_pattern),
        method = COALESCE($4, method),
        rate_limit = COALESCE($5, rate_limit),
        time_window = COALESCE($6, time_window),
        algorithm = COALESCE($7, algorithm),
        action = COALESCE($8, action),
        response_code = COALESCE($9, response_code),
        custom_message = COALESCE($10, custom_message),
        priority = COALESCE($11, priority),
        enabled = COALESCE($12, enabled),
        whitelist_ips = COALESCE($13, whitelist_ips),
        blacklist_ips = COALESCE($14, blacklist_ips),
        conditions = COALESCE($15, conditions),
        metadata = COALESCE($16, metadata),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [
      id,
      data.rule_name,
      data.path_pattern,
      data.method,
      data.rate_limit,
      data.time_window,
      data.algorithm,
      data.action,
      data.response_code,
      data.custom_message,
      data.priority,
      data.enabled,
      data.whitelist_ips,
      data.blacklist_ips,
      data.conditions,
      data.metadata
    ])
    
    if (!result.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Rate limit rule not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      rule: result.rows[0]
    })
    
  } catch (error: any) {
    console.error('Error updating rate limit rule:', error)
    
    // Check for duplicate rule name
    if (error.message?.includes('duplicate key')) {
      return NextResponse.json(
        { success: false, error: 'Rule with this name already exists' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// PATCH - Toggle enable/disable a rate limit rule
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
      UPDATE "${schema}_rate_limit_rules"
      SET 
        enabled = $2,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id, enabled])
    
    if (!result.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Rate limit rule not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      rule: result.rows[0]
    })
    
  } catch (error: any) {
    console.error('Error toggling rate limit rule:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Delete a rate limit rule
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
    
    // Delete rate limit rule
    const result = await db.query(`
      DELETE FROM "${schema}_rate_limit_rules"
      WHERE id = $1
      RETURNING *
    `, [id])
    
    if (!result.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Rate limit rule not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Rate limit rule deleted successfully',
      rule: result.rows[0]
    })
    
  } catch (error: any) {
    console.error('Error deleting rate limit rule:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}