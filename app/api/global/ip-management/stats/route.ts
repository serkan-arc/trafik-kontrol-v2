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

// GET: Get IP management statistics
export async function GET(request: NextRequest) {
  try {
    // Overall statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_ips,
        COUNT(*) FILTER (WHERE list_type = 'whitelist') as whitelisted,
        COUNT(*) FILTER (WHERE list_type = 'graylist') as graylisted,
        COUNT(*) FILTER (WHERE list_type = 'blacklist') as blacklisted,
        COUNT(*) FILTER (WHERE list_type = 'unknown') as unknown,
        COUNT(*) FILTER (WHERE is_banned = true) as banned_total,
        COUNT(*) FILTER (WHERE is_banned = true AND ban_type = 'temporary') as temp_banned,
        COUNT(*) FILTER (WHERE is_banned = true AND ban_type = 'permanent') as perm_banned,
        COUNT(*) FILTER (WHERE auto_classified = true) as auto_classified_count,
        AVG(reputation_score)::INTEGER as avg_reputation_score,
        COUNT(*) FILTER (WHERE is_vpn = true) as vpn_count,
        COUNT(*) FILTER (WHERE is_proxy = true) as proxy_count,
        COUNT(*) FILTER (WHERE is_tor = true) as tor_count,
        COUNT(*) FILTER (WHERE is_datacenter = true) as datacenter_count
      FROM global_ip_reputation
    `
    const statsResult = await pool.query(statsQuery)

    // Top countries
    const countriesQuery = `
      SELECT 
        country, 
        COUNT(*) as ip_count,
        SUM(total_requests) as total_requests,
        SUM(suspicious_requests) as suspicious_requests
      FROM global_ip_reputation
      WHERE country IS NOT NULL
      GROUP BY country
      ORDER BY ip_count DESC
      LIMIT 10
    `
    const countriesResult = await pool.query(countriesQuery)

    // Top ISPs
    const ispsQuery = `
      SELECT 
        isp, 
        COUNT(*) as ip_count,
        SUM(suspicious_requests) as suspicious_requests,
        COUNT(*) FILTER (WHERE list_type = 'blacklist') as blacklisted_count
      FROM global_ip_reputation
      WHERE isp IS NOT NULL
      GROUP BY isp
      ORDER BY ip_count DESC
      LIMIT 10
    `
    const ispsResult = await pool.query(ispsQuery)

    // Recent bans
    const recentBansQuery = `
      SELECT 
        ip, country, isp,
        ban_type, ban_reason, banned_at,
        reputation_score
      FROM global_ip_reputation
      WHERE is_banned = true
      ORDER BY banned_at DESC
      LIMIT 20
    `
    const recentBansResult = await pool.query(recentBansQuery)

    // High risk IPs (score > 70, not banned yet)
    const highRiskQuery = `
      SELECT 
        ip, country, isp,
        reputation_score,
        suspicious_requests,
        total_requests,
        last_seen_at
      FROM global_ip_reputation
      WHERE reputation_score > 70 
        AND is_banned = false
      ORDER BY reputation_score DESC
      LIMIT 20
    `
    const highRiskResult = await pool.query(highRiskQuery)

    // Activity over time (last 24 hours)
    const activityQuery = `
      SELECT 
        DATE_TRUNC('hour', hour_timestamp) as hour,
        COUNT(DISTINCT ip) as unique_ips,
        SUM(request_count) as total_requests,
        SUM(suspicious_count) as suspicious_requests
      FROM global_ip_activity
      WHERE hour_timestamp > NOW() - INTERVAL '24 hours'
      GROUP BY hour
      ORDER BY hour ASC
    `
    const activityResult = await pool.query(activityQuery)

    return NextResponse.json({
      success: true,
      stats: statsResult.rows[0],
      top_countries: countriesResult.rows,
      top_isps: ispsResult.rows,
      recent_bans: recentBansResult.rows,
      high_risk_ips: highRiskResult.rows,
      activity_timeline: activityResult.rows
    })

  } catch (error: any) {
    console.error('Error fetching IP management stats:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
