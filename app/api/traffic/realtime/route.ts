import { NextRequest, NextResponse } from 'next/server'
import { redisManager } from '@/lib/redis-manager'
import { db } from '@/lib/db'

// GET - Get real-time statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const domain = searchParams.get('domain')
    
    // Get real-time stats from Redis
    const realtimeStats = await redisManager.getRealtimeStats(domain || undefined)
    
    // Get cached traffic stats or fetch from DB
    let trafficStats = null
    
    if (domain) {
      trafficStats = await redisManager.getTrafficStats(domain)
      
      if (!trafficStats) {
        // Fetch from database and cache
        const dbStats = await db.query(`
          SELECT 
            COUNT(DISTINCT ip) as unique_visitors,
            COUNT(*) as total_requests,
            SUM(CASE WHEN is_bot THEN 1 ELSE 0 END) as bot_requests,
            SUM(CASE WHEN is_spam THEN 1 ELSE 0 END) as spam_attempts
          FROM master_traffic_log
          WHERE domain = $1 
            AND timestamp > NOW() - INTERVAL '24 hours'
        `, [domain])
        
        trafficStats = dbStats.rows[0]
        await redisManager.cacheTrafficStats(domain, trafficStats)
      }
    } else {
      // Get global stats
      const globalKey = 'dashboard:global:stats'
      trafficStats = await redisManager.getCachedDashboardData(globalKey)
      
      if (!trafficStats) {
        const dbStats = await db.query(`
          SELECT 
            COUNT(DISTINCT domain) as total_domains,
            COUNT(DISTINCT ip) as unique_visitors,
            COUNT(*) as total_requests,
            SUM(CASE WHEN is_bot THEN 1 ELSE 0 END) as bot_requests,
            SUM(CASE WHEN is_spam THEN 1 ELSE 0 END) as spam_attempts
          FROM master_traffic_log
          WHERE timestamp > NOW() - INTERVAL '24 hours'
        `)
        
        trafficStats = dbStats.rows[0]
        await redisManager.cacheDashboardData(globalKey, trafficStats, 60)
      }
    }
    
    // Get top threats from Redis
    const threats = []
    if (domain) {
      // Check recent blocked IPs
      const blockedIPs = await db.query(`
        SELECT ip, COUNT(*) as attempts, MAX(timestamp) as last_attempt
        FROM master_traffic_log
        WHERE domain = $1 
          AND action_taken = 'blocked'
          AND timestamp > NOW() - INTERVAL '1 hour'
        GROUP BY ip
        ORDER BY attempts DESC
        LIMIT 5
      `, [domain])
      
      threats.push(...blockedIPs.rows)
    }
    
    return NextResponse.json({
      success: true,
      realtime: realtimeStats,
      stats: trafficStats,
      threats,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('Error fetching realtime stats:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}