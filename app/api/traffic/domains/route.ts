import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { redis } from '@/lib/redis'

/**
 * Setup Redis keys and cache structure for a new domain
 * Creates necessary Redis keys with default values
 */
async function setupRedisForDomain(domain: string, dbSchema: string) {
  const domainPrefix = `domain:${domain}`
  
  try {
    // 1. Initialize domain configuration
    await redis.set(
      `${domainPrefix}:config`,
      JSON.stringify({
        domain,
        dbSchema,
        status: 'active',
        createdAt: new Date().toISOString(),
        cacheEnabled: true,
        rateLimitEnabled: true
      }),
      86400 // 24 hours TTL
    )

    // 2. Initialize statistics cache
    await redis.set(
      `${domainPrefix}:stats`,
      JSON.stringify({
        totalVisits: 0,
        uniqueVisitors: 0,
        botsBlocked: 0,
        spamBlocked: 0,
        lastUpdated: new Date().toISOString()
      }),
      3600 // 1 hour TTL
    )

    // 3. Initialize IP whitelist/blacklist cache
    await redis.set(
      `${domainPrefix}:whitelist`,
      JSON.stringify([]),
      86400 // 24 hours
    )
    
    await redis.set(
      `${domainPrefix}:blacklist`,
      JSON.stringify([]),
      86400 // 24 hours
    )

    // 4. Initialize rate limit counters
    await redis.set(
      `${domainPrefix}:ratelimit:default`,
      '0',
      60 // 1 minute TTL
    )

    // 5. Initialize bot detection cache
    await redis.set(
      `${domainPrefix}:bot_patterns`,
      JSON.stringify({
        enabled: true,
        patterns: [],
        lastSync: new Date().toISOString()
      }),
      3600 // 1 hour
    )

    // 6. Mark domain as Redis-ready
    await redis.set(
      `${domainPrefix}:redis_ready`,
      'true',
      86400 // 24 hours
    )

    console.log(`✅ Redis setup completed for domain: ${domain}`)
    return true
  } catch (error) {
    console.error(`❌ Redis setup failed for domain ${domain}:`, error)
    throw error
  }
}

/**
 * Cleanup Redis keys when domain is deleted
 */
async function cleanupRedisForDomain(domain: string) {
  const domainPrefix = `domain:${domain}`
  
  try {
    // Get all keys for this domain
    const pattern = `${domainPrefix}:*`
    
    // Note: KEYS command is not available in some Redis setups
    // So we'll delete known keys explicitly
    const keysToDelete = [
      `${domainPrefix}:config`,
      `${domainPrefix}:stats`,
      `${domainPrefix}:whitelist`,
      `${domainPrefix}:blacklist`,
      `${domainPrefix}:ratelimit:default`,
      `${domainPrefix}:bot_patterns`,
      `${domainPrefix}:redis_ready`
    ]

    for (const key of keysToDelete) {
      try {
        await redis.del(key)
      } catch (err) {
        console.warn(`Failed to delete Redis key ${key}:`, err)
      }
    }

    console.log(`✅ Redis cleanup completed for domain: ${domain}`)
    return true
  } catch (error) {
    console.error(`❌ Redis cleanup failed for domain ${domain}:`, error)
    throw error
  }
}

// GET - List all domains
export async function GET() {
  try {
    // Get all domains first
    const domainsResult = await db.query(`
      SELECT 
        id,
        domain,
        db_schema,
        status,
        traffic_settings,
        created_at,
        updated_at
      FROM master_domains
      WHERE status = 'active'
      ORDER BY created_at DESC
    `)
    
    // Fetch stats for each domain
    const domainsWithStats = await Promise.all(
      domainsResult.rows.map(async (domain) => {
        const schema = domain.db_schema
        
        try {
          // Get total visits from traffic_logs
          const visitsResult = await db.query(`
            SELECT COUNT(*) as total_visits
            FROM "${schema}_traffic_logs"
          `).catch(() => ({ rows: [{ total_visits: 0 }] }))
          
          // Get today's unique visitors
          const todayVisitorsResult = await db.query(`
            SELECT COUNT(DISTINCT ip_address) as unique_visitors_today
            FROM "${schema}_traffic_logs"
            WHERE created_at >= CURRENT_DATE
          `).catch(() => ({ rows: [{ unique_visitors_today: 0 }] }))
          
          // Get bot detections
          const botsResult = await db.query(`
            SELECT 
              COUNT(*) as total_bots,
              COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as bots_today
            FROM "${schema}_bot_detections"
            WHERE blocked = true
          `).catch(() => ({ rows: [{ total_bots: 0, bots_today: 0 }] }))
          
          // Get spam detections
          const spamResult = await db.query(`
            SELECT 
              COUNT(*) as total_spam,
              COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as spam_today
            FROM "${schema}_spam_detections"
            WHERE blocked = true
          `).catch(() => ({ rows: [{ total_spam: 0, spam_today: 0 }] }))
          
          // Get last traffic timestamp
          const lastTrafficResult = await db.query(`
            SELECT MAX(created_at) as last_traffic_at
            FROM "${schema}_traffic_logs"
          `).catch(() => ({ rows: [{ last_traffic_at: null }] }))
          
          return {
            ...domain,
            total_visits: parseInt(visitsResult.rows[0]?.total_visits || 0),
            total_bots_blocked: parseInt(botsResult.rows[0]?.total_bots || 0),
            total_spam_blocked: parseInt(spamResult.rows[0]?.total_spam || 0),
            unique_visitors_today: parseInt(todayVisitorsResult.rows[0]?.unique_visitors_today || 0),
            bots_blocked_today: parseInt(botsResult.rows[0]?.bots_today || 0),
            spam_blocked_today: parseInt(spamResult.rows[0]?.spam_today || 0),
            last_traffic_at: lastTrafficResult.rows[0]?.last_traffic_at
          }
        } catch (error) {
          console.error(`Error fetching stats for domain ${domain.domain}:`, error)
          // Return domain with zero stats if tables don't exist yet
          return {
            ...domain,
            total_visits: 0,
            total_bots_blocked: 0,
            total_spam_blocked: 0,
            unique_visitors_today: 0,
            bots_blocked_today: 0,
            spam_blocked_today: 0,
            last_traffic_at: null
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      domains: domainsWithStats || [],
      total: domainsWithStats.length || 0
    })
  } catch (error: any) {
    console.error('Error fetching domains:', error)
    
    // If table doesn't exist, return empty array
    if (error.message?.includes('does not exist')) {
      return NextResponse.json({
        success: true,
        domains: [],
        total: 0,
        message: 'Multi-domain support not initialized yet'
      })
    }
    
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// POST - Add new domain
export async function POST(request: NextRequest) {
  try {
    const { domain } = await request.json()
    
    if (!domain) {
      return NextResponse.json(
        { success: false, error: 'Domain is required' },
        { status: 400 }
      )
    }

    // Validate domain format
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i
    if (!domainRegex.test(domain)) {
      return NextResponse.json(
        { success: false, error: 'Invalid domain format' },
        { status: 400 }
      )
    }

    // Create schema name (replace dots with underscores)
    const dbSchema = domain.replace(/\./g, '_').toLowerCase()

    // Start transaction
    await db.query('BEGIN')

    try {
      // 1. Insert into master_domains
      const insertResult = await db.query(`
        INSERT INTO master_domains (domain, db_schema, status)
        VALUES ($1, $2, 'active')
        RETURNING *
      `, [domain, dbSchema])

      // 2. Create domain-specific tables using the function from migration-simple
      try {
        await db.query(`SELECT create_domain_tables($1)`, [domain])
      } catch (funcError: any) {
        console.log('Function call failed, creating tables manually...')
        // If function doesn't exist, create tables manually
        const schema = dbSchema
        
        // Create IP addresses table
        await db.query(`
          CREATE TABLE IF NOT EXISTS "${schema}_ip_addresses" (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            ip_address INET NOT NULL UNIQUE,
            country VARCHAR(100),
            country_code VARCHAR(10),
            city VARCHAR(100),
            list_type VARCHAR(20) DEFAULT 'unknown',
            risk_score INTEGER DEFAULT 0,
            first_seen TIMESTAMP DEFAULT NOW(),
            last_seen TIMESTAMP DEFAULT NOW(),
            notes TEXT
          )
        `)
        
        // Create other essential tables
        await db.query(`
          CREATE TABLE IF NOT EXISTS "${schema}_traffic_logs" (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            ip_address INET NOT NULL,
            path TEXT,
            method VARCHAR(10),
            status_code INTEGER,
            user_agent TEXT,
            referer TEXT,
            created_at TIMESTAMP DEFAULT NOW()
          )
        `)
        
        await db.query(`
          CREATE TABLE IF NOT EXISTS "${schema}_bot_detections" (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            ip_address INET NOT NULL,
            bot_type VARCHAR(100),
            detection_method VARCHAR(100),
            is_fake BOOLEAN DEFAULT false,
            confidence_score DECIMAL(3,2),
            created_at TIMESTAMP DEFAULT NOW()
          )
        `)
        
        await db.query(`
          CREATE TABLE IF NOT EXISTS "${schema}_spam_reports" (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            ip_address INET NOT NULL,
            spam_type VARCHAR(100),
            content TEXT,
            confidence_score DECIMAL(3,2),
            created_at TIMESTAMP DEFAULT NOW()
          )
        `)
        
        await db.query(`
          CREATE TABLE IF NOT EXISTS "${schema}_form_submissions" (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            ip_address INET NOT NULL,
            form_data JSONB DEFAULT '{}',
            is_spam BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT NOW()
          )
        `)
      }

      // Commit transaction
      await db.query('COMMIT')

      // 3. Setup Redis keys for the new domain
      try {
        await setupRedisForDomain(domain, dbSchema)
      } catch (redisError: any) {
        console.warn('Redis setup failed (non-critical):', redisError.message)
        // Don't fail the request if Redis setup fails
      }

      return NextResponse.json({
        success: true,
        domain: insertResult.rows[0],
        message: `Domain ${domain} added successfully with dedicated tables and Redis cache`
      })

    } catch (error) {
      // Rollback on error
      await db.query('ROLLBACK')
      throw error
    }

  } catch (error: any) {
    console.error('Error adding domain:', error)
    
    // Check for duplicate domain
    if (error.message?.includes('duplicate key')) {
      return NextResponse.json(
        { success: false, error: 'Domain already exists' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Remove domain
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const domain = searchParams.get('domain')
    
    if (!domain) {
      return NextResponse.json(
        { success: false, error: 'Domain is required' },
        { status: 400 }
      )
    }

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

    const dbSchema = domainResult.rows[0].db_schema

    // Start transaction
    await db.query('BEGIN')

    try {
      // 1. Delete domain-specific tables
      try {
        await db.query(`SELECT delete_domain_tables($1)`, [dbSchema])
      } catch (funcError) {
        // If function doesn't exist, delete tables manually
        const tablesToDrop = [
          `"${dbSchema}_ip_addresses"`,
          `"${dbSchema}_traffic_logs"`,
          `"${dbSchema}_bot_detections"`,
          `"${dbSchema}_spam_reports"`,
          `"${dbSchema}_form_submissions"`,
          `"${dbSchema}_traffic_rules"`,
          `"${dbSchema}_traffic_settings"`
        ]
        
        for (const table of tablesToDrop) {
          await db.query(`DROP TABLE IF EXISTS ${table} CASCADE`).catch(e => 
            console.log(`Table ${table} doesn't exist or already deleted`)
          )
        }
      }

      // 2. Delete from master_domains (cascade will delete related records)
      await db.query('DELETE FROM master_domains WHERE domain = $1', [domain])

      // Commit transaction
      await db.query('COMMIT')

      // 3. Cleanup Redis keys for the deleted domain
      try {
        await cleanupRedisForDomain(domain)
      } catch (redisError: any) {
        console.warn('Redis cleanup failed (non-critical):', redisError.message)
        // Don't fail the request if Redis cleanup fails
      }

      return NextResponse.json({
        success: true,
        message: `Domain ${domain} and all its data (including Redis cache) have been deleted`
      })

    } catch (error) {
      // Rollback on error
      await db.query('ROLLBACK')
      throw error
    }

  } catch (error: any) {
    console.error('Error deleting domain:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}