import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Country names mapping
const countryNames: Record<string, string> = {
  'US': 'Amerika Birleşik Devletleri',
  'CN': 'Çin',
  'RU': 'Rusya',
  'IN': 'Hindistan',
  'DE': 'Almanya',
  'FR': 'Fransa',
  'GB': 'İngiltere',
  'TR': 'Türkiye',
  'IR': 'İran',
  'KP': 'Kuzey Kore',
  'JP': 'Japonya',
  'KR': 'Güney Kore',
  'IT': 'İtalya',
  'ES': 'İspanya',
  'CA': 'Kanada',
  'AU': 'Avustralya',
  'BR': 'Brezilya',
  'MX': 'Meksika',
  'NL': 'Hollanda',
  'SE': 'İsveç'
}

// GET - List all GeoIP rules for a domain
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
    
    // Ensure geoip_rules table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS "${schema}_geoip_rules" (
        id SERIAL PRIMARY KEY,
        rule_name VARCHAR(255) UNIQUE NOT NULL,
        country_code VARCHAR(2) NOT NULL,
        country_name VARCHAR(100),
        action VARCHAR(20) NOT NULL CHECK (action IN ('allow', 'block', 'monitor')),
        enabled BOOLEAN DEFAULT true,
        priority INTEGER DEFAULT 100,
        hits_count INTEGER DEFAULT 0,
        last_hit TIMESTAMP WITH TIME ZONE,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `).catch(() => {})
    
    // Get GeoIP rules
    const rules = await db.query(`
      SELECT * FROM "${schema}_geoip_rules"
      ORDER BY priority ASC, created_at DESC
    `).catch(() => ({ rows: [] }))
    
    // Add country names to rules
    const rulesWithNames = rules.rows.map(rule => ({
      ...rule,
      country_name: rule.country_name || countryNames[rule.country_code] || rule.country_code
    }))
    
    // Get statistics
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_countries,
        COUNT(*) FILTER (WHERE action = 'block' AND enabled = true) as blocked_countries,
        COUNT(*) FILTER (WHERE action = 'monitor' AND enabled = true) as monitored_countries,
        SUM(hits_count) as total_blocks,
        SUM(CASE WHEN last_hit > NOW() - INTERVAL '24 hours' THEN hits_count ELSE 0 END) as blocks_24h
      FROM "${schema}_geoip_rules"
    `).catch(() => ({ 
      rows: [{ 
        total_countries: 0,
        blocked_countries: 0,
        monitored_countries: 0,
        total_blocks: 0,
        blocks_24h: 0
      }] 
    }))
    
    // Get top blocked country
    const topBlocked = await db.query(`
      SELECT country_code, country_name, SUM(hits_count) as total_hits
      FROM "${schema}_geoip_rules"
      WHERE action = 'block' AND hits_count > 0
      GROUP BY country_code, country_name
      ORDER BY total_hits DESC
      LIMIT 1
    `).catch(() => ({ rows: [] }))
    
    return NextResponse.json({
      success: true,
      rules: rulesWithNames,
      statistics: {
        ...stats.rows[0],
        top_blocked_country: topBlocked.rows[0]?.country_code || ''
      }
    })
    
  } catch (error: any) {
    console.error('Error fetching GeoIP rules:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// POST - Create a new GeoIP rule
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
      CREATE TABLE IF NOT EXISTS "${schema}_geoip_rules" (
        id SERIAL PRIMARY KEY,
        rule_name VARCHAR(255) UNIQUE NOT NULL,
        country_code VARCHAR(2) NOT NULL,
        country_name VARCHAR(100),
        action VARCHAR(20) NOT NULL CHECK (action IN ('allow', 'block', 'monitor')),
        enabled BOOLEAN DEFAULT true,
        priority INTEGER DEFAULT 100,
        hits_count INTEGER DEFAULT 0,
        last_hit TIMESTAMP WITH TIME ZONE,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `).catch(() => {})
    
    // Get country name
    const countryName = countryNames[data.country_code] || data.country_code
    
    // Insert GeoIP rule
    const result = await db.query(`
      INSERT INTO "${schema}_geoip_rules" 
      (rule_name, country_code, country_name, action, enabled, priority, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      data.rule_name,
      data.country_code,
      countryName,
      data.action || 'block',
      data.enabled !== false,
      data.priority || 100,
      data.metadata || {}
    ])
    
    return NextResponse.json({
      success: true,
      rule: result.rows[0]
    })
    
  } catch (error: any) {
    console.error('Error creating GeoIP rule:', error)
    
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