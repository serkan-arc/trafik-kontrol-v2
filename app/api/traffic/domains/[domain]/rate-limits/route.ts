import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - List all rate limit rules for a domain
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
    
    // Get rate limit rules
    const rules = await db.query(`
      SELECT * FROM "${schema}_rate_limit_rules"
      ORDER BY priority ASC, created_at DESC
    `).catch(() => ({ rows: [] }))
    
    // Get statistics for each rule
    const rulesWithStats = await Promise.all(
      rules.rows.map(async (rule) => {
        // Get hit count from traffic logs
        const statsResult = await db.query(`
          SELECT 
            COUNT(*) as total_hits,
            COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as hits_24h,
            COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as hits_1h
          FROM "${schema}_traffic_logs"
          WHERE path LIKE $1
            AND created_at > NOW() - INTERVAL '7 days'
        `, [rule.path_pattern || '%']).catch(() => ({ 
          rows: [{ total_hits: 0, hits_24h: 0, hits_1h: 0 }] 
        }))
        
        // Get blocked count
        const blockedResult = await db.query(`
          SELECT 
            COUNT(*) as total_blocked,
            COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as blocked_24h
          FROM "${schema}_rate_limit_logs"
          WHERE rule_id = $1
        `, [rule.id]).catch(() => ({ 
          rows: [{ total_blocked: 0, blocked_24h: 0 }] 
        }))
        
        return {
          ...rule,
          statistics: {
            ...statsResult.rows[0],
            ...blockedResult.rows[0]
          }
        }
      })
    )
    
    // Get overall statistics
    const overallStats = await db.query(`
      SELECT 
        COUNT(DISTINCT rule_id) as active_rules,
        COUNT(*) as total_blocks,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as blocks_24h,
        COUNT(DISTINCT ip_address) as unique_ips_blocked
      FROM "${schema}_rate_limit_logs"
    `).catch(() => ({ 
      rows: [{ 
        active_rules: 0, 
        total_blocks: 0, 
        blocks_24h: 0, 
        unique_ips_blocked: 0 
      }] 
    }))
    
    return NextResponse.json({
      success: true,
      rules: rulesWithStats,
      statistics: overallStats.rows[0]
    })
    
  } catch (error: any) {
    console.error('Error fetching rate limit rules:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// POST - Create a new rate limit rule
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
    
    // Ensure rate_limit_rules table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS "${schema}_rate_limit_rules" (
        id SERIAL PRIMARY KEY,
        rule_name VARCHAR(255) UNIQUE NOT NULL,
        path_pattern VARCHAR(500),
        method VARCHAR(10),
        rate_limit INTEGER NOT NULL,
        time_window INTEGER NOT NULL,
        algorithm VARCHAR(50) DEFAULT 'fixed_window',
        action VARCHAR(50) DEFAULT 'block',
        response_code INTEGER DEFAULT 429,
        custom_message TEXT,
        priority INTEGER DEFAULT 100,
        enabled BOOLEAN DEFAULT true,
        whitelist_ips TEXT[],
        blacklist_ips TEXT[],
        conditions JSONB,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `).catch(() => {})
    
    // Create rate_limit_logs table if not exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS "${schema}_rate_limit_logs" (
        id SERIAL PRIMARY KEY,
        rule_id INTEGER REFERENCES "${schema}_rate_limit_rules"(id) ON DELETE CASCADE,
        ip_address VARCHAR(45),
        path VARCHAR(500),
        method VARCHAR(10),
        user_agent TEXT,
        blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `).catch(() => {})
    
    // Insert rate limit rule
    const result = await db.query(`
      INSERT INTO "${schema}_rate_limit_rules" 
      (rule_name, path_pattern, method, rate_limit, time_window, 
       algorithm, action, response_code, custom_message, priority, 
       enabled, whitelist_ips, blacklist_ips, conditions, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      data.rule_name,
      data.path_pattern || '*',
      data.method || 'ALL',
      data.rate_limit,
      data.time_window,
      data.algorithm || 'fixed_window',
      data.action || 'block',
      data.response_code || 429,
      data.custom_message || 'Too many requests, please try again later.',
      data.priority || 100,
      data.enabled !== false,
      data.whitelist_ips || [],
      data.blacklist_ips || [],
      data.conditions || {},
      data.metadata || {}
    ])
    
    return NextResponse.json({
      success: true,
      rule: result.rows[0]
    })
    
  } catch (error: any) {
    console.error('Error creating rate limit rule:', error)
    
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