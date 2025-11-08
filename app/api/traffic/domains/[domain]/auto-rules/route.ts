import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - List all auto rules for a domain
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
    
    // Ensure auto_rules table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS "${schema}_auto_rules" (
        id SERIAL PRIMARY KEY,
        rule_name VARCHAR(255) UNIQUE NOT NULL,
        rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('bot_detection', 'spam_prevention', 'rate_limit', 'geo_block', 'security')),
        condition TEXT NOT NULL,
        action VARCHAR(20) NOT NULL CHECK (action IN ('block', 'flag', 'monitor', 'challenge')),
        threshold INTEGER,
        time_window INTEGER,
        enabled BOOLEAN DEFAULT true,
        priority INTEGER DEFAULT 50,
        hits INTEGER DEFAULT 0,
        last_triggered TIMESTAMP WITH TIME ZONE,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `).catch(() => {})
    
    // Get auto rules
    const rules = await db.query(`
      SELECT * FROM "${schema}_auto_rules"
      ORDER BY priority ASC, created_at DESC
    `).catch(() => ({ rows: [] }))
    
    // Get statistics
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_rules,
        COUNT(*) FILTER (WHERE enabled = true) as active_rules,
        SUM(CASE WHEN last_triggered > NOW() - INTERVAL '24 hours' THEN hits ELSE 0 END) as triggered_today,
        COUNT(*) FILTER (WHERE action = 'block' AND last_triggered > NOW() - INTERVAL '24 hours') as blocked_today
      FROM "${schema}_auto_rules"
    `).catch(() => ({ 
      rows: [{ 
        total_rules: 0,
        active_rules: 0,
        triggered_today: 0,
        blocked_today: 0
      }] 
    }))
    
    // Calculate effectiveness rate (mock calculation)
    const effectivenessRate = stats.rows[0].active_rules > 0 
      ? Math.round((stats.rows[0].triggered_today / (stats.rows[0].active_rules * 100)) * 100)
      : 0
    
    return NextResponse.json({
      success: true,
      rules: rules.rows,
      statistics: {
        ...stats.rows[0],
        effectiveness_rate: Math.min(effectivenessRate, 95) // Cap at 95%
      }
    })
    
  } catch (error: any) {
    console.error('Error fetching auto rules:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// POST - Create a new auto rule
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
    
    // Ensure table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS "${schema}_auto_rules" (
        id SERIAL PRIMARY KEY,
        rule_name VARCHAR(255) UNIQUE NOT NULL,
        rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('bot_detection', 'spam_prevention', 'rate_limit', 'geo_block', 'security')),
        condition TEXT NOT NULL,
        action VARCHAR(20) NOT NULL CHECK (action IN ('block', 'flag', 'monitor', 'challenge')),
        threshold INTEGER,
        time_window INTEGER,
        enabled BOOLEAN DEFAULT true,
        priority INTEGER DEFAULT 50,
        hits INTEGER DEFAULT 0,
        last_triggered TIMESTAMP WITH TIME ZONE,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `).catch(() => {})
    
    // Insert auto rule
    const result = await db.query(`
      INSERT INTO "${schema}_auto_rules" 
      (rule_name, rule_type, condition, action, threshold, time_window, enabled, priority, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      data.rule_name,
      data.rule_type,
      data.condition,
      data.action || 'monitor',
      data.threshold || 0,
      data.time_window || 60,
      data.enabled !== false,
      data.priority || 50,
      data.metadata || {}
    ])
    
    return NextResponse.json({
      success: true,
      rule: result.rows[0]
    })
    
  } catch (error: any) {
    console.error('Error creating auto rule:', error)
    
    // Check for duplicate rule
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