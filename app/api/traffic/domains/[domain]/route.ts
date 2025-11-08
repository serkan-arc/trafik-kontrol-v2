import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Get domain info with real-time stats
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
    
    const domainInfo = domainResult.rows[0]
    const schema = domainInfo.db_schema
    
    // Fetch real-time stats
    try {
      // Traffic stats
      const trafficStats = await db.query(`
        SELECT 
          COUNT(*) as total_visits,
          COUNT(DISTINCT ip_address) as unique_visitors,
          COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as visits_today,
          COUNT(DISTINCT CASE WHEN created_at >= CURRENT_DATE THEN ip_address END) as unique_visitors_today
        FROM "${schema}_traffic_logs"
      `).catch(() => ({ 
        rows: [{ 
          total_visits: 0, 
          unique_visitors: 0, 
          visits_today: 0, 
          unique_visitors_today: 0 
        }] 
      }))
      
      // Bot stats
      const botStats = await db.query(`
        SELECT 
          COUNT(*) as total_bots_blocked,
          COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as bots_blocked_today,
          COUNT(DISTINCT bot_name) as unique_bot_types
        FROM "${schema}_bot_detections"
        WHERE blocked = true
      `).catch(() => ({ 
        rows: [{ 
          total_bots_blocked: 0, 
          bots_blocked_today: 0,
          unique_bot_types: 0 
        }] 
      }))
      
      // Spam stats
      const spamStats = await db.query(`
        SELECT 
          COUNT(*) as total_spam_blocked,
          COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as spam_blocked_today
        FROM "${schema}_spam_detections"
        WHERE blocked = true
      `).catch(() => ({ 
        rows: [{ 
          total_spam_blocked: 0, 
          spam_blocked_today: 0 
        }] 
      }))
      
      // Last traffic
      const lastTraffic = await db.query(`
        SELECT MAX(created_at) as last_traffic_at
        FROM "${schema}_traffic_logs"
      `).catch(() => ({ rows: [{ last_traffic_at: null }] }))
      
      // Combine all data
      const fullDomainInfo = {
        ...domainInfo,
        ...trafficStats.rows[0],
        ...botStats.rows[0],
        ...spamStats.rows[0],
        last_traffic_at: lastTraffic.rows[0].last_traffic_at
      }
      
      return NextResponse.json({
        success: true,
        domain: fullDomainInfo
      })
      
    } catch (statsError) {
      console.error('Error fetching domain stats:', statsError)
      // Return domain info without stats if tables don't exist
      return NextResponse.json({
        success: true,
        domain: {
          ...domainInfo,
          total_visits: 0,
          unique_visitors: 0,
          visits_today: 0,
          unique_visitors_today: 0,
          total_bots_blocked: 0,
          bots_blocked_today: 0,
          unique_bot_types: 0,
          total_spam_blocked: 0,
          spam_blocked_today: 0,
          last_traffic_at: null
        }
      })
    }
    
  } catch (error: any) {
    console.error('Error fetching domain:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}