import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Get detailed domain statistics
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await context.params
    
    // Get domain info
    const domainResult = await db.query(
      'SELECT * FROM master_domains WHERE domain = $1 AND status = $2',
      [domain, 'active']
    )
    
    if (!domainResult.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Domain not found or inactive' },
        { status: 404 }
      )
    }
    
    const schema = domainResult.rows[0].db_schema
    
    // Fetch comprehensive statistics
    const stats = {
      overview: {} as any,
      lists: {} as any,
      risk_levels: {} as any,
      bots: {} as any,
      recent_activity: [] as Array<{
        id: string
        type: string
        ip: string
        message: string
        timestamp: string
      }>
    }
    
    try {
      // Overview stats
      const overviewResult = await db.query(`
        SELECT 
          (SELECT COUNT(DISTINCT ip_address) FROM "${schema}_ip_addresses") as total_ips,
          (SELECT COUNT(DISTINCT ip_address) FROM "${schema}_ip_addresses" WHERE first_seen >= CURRENT_DATE - INTERVAL '7 days') as new_ips,
          (SELECT COUNT(*) FROM "${schema}_traffic_logs") as total_visits,
          (SELECT COUNT(DISTINCT ip_address) FROM "${schema}_traffic_logs") as unique_visitors,
          (SELECT COUNT(*) FROM "${schema}_form_submissions") as total_form_submissions,
          (SELECT COUNT(*) FROM "${schema}_form_submissions" WHERE is_spam = true) as spam_submissions
      `).catch(() => ({ 
        rows: [{ 
          total_ips: 0, 
          new_ips: 0, 
          total_visits: 0, 
          unique_visitors: 0, 
          total_form_submissions: 0, 
          spam_submissions: 0 
        }] 
      }))
      stats.overview = overviewResult.rows[0]
      
      // IP List distribution
      const listResult = await db.query(`
        SELECT 
          list_type,
          COUNT(*) as count
        FROM "${schema}_ip_addresses"
        GROUP BY list_type
      `).catch(() => ({ rows: [] }))
      
      const listCounts = {
        whitelist: 0,
        graylist: 0,
        blacklist: 0,
        unknown: 0
      }
      listResult.rows.forEach((row: any) => {
        if (row.list_type in listCounts) {
          listCounts[row.list_type as keyof typeof listCounts] = parseInt(row.count)
        }
      })
      stats.lists = listCounts
      
      // Risk level distribution
      const riskResult = await db.query(`
        SELECT 
          CASE 
            WHEN risk_score < 30 THEN 'low'
            WHEN risk_score < 70 THEN 'medium'
            ELSE 'high'
          END as risk_level,
          COUNT(*) as count,
          AVG(risk_score) as avg_score
        FROM "${schema}_ip_addresses"
        GROUP BY risk_level
      `).catch(() => ({ rows: [] }))
      
      const riskLevels: any = {}
      riskResult.rows.forEach((row: any) => {
        riskLevels[row.risk_level] = {
          count: parseInt(row.count),
          avg_score: parseFloat(row.avg_score || 0)
        }
      })
      stats.risk_levels = riskLevels
      
      // Bot statistics
      const botResult = await db.query(`
        SELECT 
          COUNT(CASE WHEN is_fake = false THEN 1 END) as verified,
          COUNT(CASE WHEN is_fake = true THEN 1 END) as fake,
          COUNT(DISTINCT bot_type) as types
        FROM "${schema}_bot_detections"
      `).catch(() => ({ rows: [{ verified: 0, fake: 0, types: 0 }] }))
      stats.bots = botResult.rows[0]
      
      // Recent activity (combine different activity types)
      const recentActivities: any[] = []
      
      // Recent bot detections
      const recentBots = await db.query(`
        SELECT 
          'bot' as type,
          ip_address as ip,
          bot_name || ' detected' as message,
          created_at as timestamp
        FROM "${schema}_bot_detections"
        ORDER BY created_at DESC
        LIMIT 3
      `).catch(() => ({ rows: [] }))
      recentActivities.push(...recentBots.rows)
      
      // Recent spam detections
      const recentSpam = await db.query(`
        SELECT 
          'spam' as type,
          ip_address as ip,
          'Spam attempt blocked' as message,
          created_at as timestamp
        FROM "${schema}_spam_detections"
        WHERE blocked = true
        ORDER BY created_at DESC
        LIMIT 3
      `).catch(() => ({ rows: [] }))
      recentActivities.push(...recentSpam.rows)
      
      // Recent traffic
      const recentTraffic = await db.query(`
        SELECT 
          'traffic' as type,
          ip_address as ip,
          path || ' visited' as message,
          created_at as timestamp
        FROM "${schema}_traffic_logs"
        ORDER BY created_at DESC
        LIMIT 4
      `).catch(() => ({ rows: [] }))
      recentActivities.push(...recentTraffic.rows)
      
      // Sort by timestamp and add IDs
      stats.recent_activity = recentActivities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10)
        .map((activity, index) => ({
          ...activity,
          id: `activity-${index}`
        }))
      
    } catch (statsError) {
      console.error('Error fetching domain stats:', statsError)
    }
    
    return NextResponse.json({
      success: true,
      stats
    })
    
  } catch (error: any) {
    console.error('Error in domain stats:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}