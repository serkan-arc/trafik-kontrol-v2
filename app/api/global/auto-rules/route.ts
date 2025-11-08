import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'traffic_control',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 20,
})

// GET - List all rules
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ruleType = searchParams.get('rule_type')
    const enabled = searchParams.get('enabled')
    const applyTo = searchParams.get('apply_to')

    let conditions: string[] = []
    let params: any[] = []
    let paramIndex = 1

    if (ruleType) {
      conditions.push(`rule_type = $${paramIndex}`)
      params.push(ruleType)
      paramIndex++
    }

    if (enabled !== null && enabled !== undefined) {
      conditions.push(`enabled = $${paramIndex}`)
      params.push(enabled === 'true')
      paramIndex++
    }

    if (applyTo) {
      conditions.push(`apply_to = $${paramIndex}`)
      params.push(applyTo)
      paramIndex++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const query = `
      SELECT 
        id,
        rule_name,
        rule_type,
        conditions,
        action,
        action_config,
        priority,
        enabled,
        apply_to,
        domain_list,
        triggered_count,
        last_triggered_at,
        blocked_requests,
        challenged_requests,
        description,
        created_by,
        created_at,
        updated_at
      FROM global_auto_rules
      ${whereClause}
      ORDER BY priority DESC, created_at DESC
    `

    const result = await pool.query(query, params)

    // Get statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_rules,
        COUNT(*) FILTER (WHERE enabled = true) as enabled_rules,
        COUNT(*) FILTER (WHERE rule_type = 'rate_limit') as rate_limit_rules,
        COUNT(*) FILTER (WHERE rule_type = 'path_blocking') as path_blocking_rules,
        COUNT(*) FILTER (WHERE rule_type = 'geo_blocking') as geo_blocking_rules,
        SUM(triggered_count) as total_triggers,
        SUM(blocked_requests) as total_blocks
      FROM global_auto_rules
    `
    const statsResult = await pool.query(statsQuery)

    return NextResponse.json({
      success: true,
      data: {
        rules: result.rows,
        statistics: statsResult.rows[0]
      }
    })
  } catch (error: any) {
    console.error('Error listing rules:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// POST - Create new rule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      rule_name,
      rule_type,
      conditions,
      action,
      action_config,
      priority,
      enabled,
      apply_to,
      domain_list,
      description,
      created_by
    } = body

    if (!rule_name || !rule_type || !conditions || !action) {
      return NextResponse.json({
        success: false,
        error: 'rule_name, rule_type, conditions, and action are required'
      }, { status: 400 })
    }

    const query = `
      INSERT INTO global_auto_rules (
        rule_name,
        rule_type,
        conditions,
        action,
        action_config,
        priority,
        enabled,
        apply_to,
        domain_list,
        description,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `

    const params = [
      rule_name,
      rule_type,
      JSON.stringify(conditions),
      action,
      JSON.stringify(action_config || {}),
      priority || 0,
      enabled !== undefined ? enabled : true,
      apply_to || 'all',
      domain_list || [],
      description || null,
      created_by || 'admin'
    ]

    const result = await pool.query(query, params)

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Rule created successfully'
    })
  } catch (error: any) {
    console.error('Error creating rule:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// PUT - Update existing rule
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Rule ID is required'
      }, { status: 400 })
    }

    const allowedFields = [
      'rule_name', 'rule_type', 'conditions', 'action', 'action_config',
      'priority', 'enabled', 'apply_to', 'domain_list', 'description'
    ]

    const updateFields: string[] = []
    const params: any[] = []
    let paramIndex = 1

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = $${paramIndex}`)
        if (key === 'conditions' || key === 'action_config') {
          params.push(JSON.stringify(value))
        } else {
          params.push(value)
        }
        paramIndex++
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid fields to update'
      }, { status: 400 })
    }

    updateFields.push(`updated_at = NOW()`)
    params.push(id)

    const query = `
      UPDATE global_auto_rules
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `

    const result = await pool.query(query, params)

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Rule not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Rule updated successfully'
    })
  } catch (error: any) {
    console.error('Error updating rule:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// DELETE - Delete rule
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Rule ID is required'
      }, { status: 400 })
    }

    const query = `
      DELETE FROM global_auto_rules
      WHERE id = $1
      RETURNING rule_name
    `

    const result = await pool.query(query, [id])

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Rule not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: `Rule "${result.rows[0].rule_name}" deleted successfully`
    })
  } catch (error: any) {
    console.error('Error deleting rule:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
