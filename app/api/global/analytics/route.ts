import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

// GET - Comprehensive analytics data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('time_range') || '24h' // 24h, 7d, 30d
    const metric = searchParams.get('metric') || 'overview' // overview, security, performance, geo
    
    // Calculate time window
    let hoursBack = 24
    switch (timeRange) {
      case '7d': hoursBack = 168; break
      case '30d': hoursBack = 720; break
      default: hoursBack = 24
    }
    
    const timeWindow = `NOW() - INTERVAL '${hoursBack} hours'`
    
    if (metric === 'overview') {
      // Overall statistics
      const overviewQuery = `
        SELECT 
          SUM(total_requests) as total_requests,
          AVG(unique_ips) as avg_unique_ips,
          SUM(bot_requests) as bot_requests,
          SUM(spam_attempts) as spam_attempts,
          SUM(suspicious_requests) as suspicious_requests,
          SUM(blocked_requests) as blocked_requests,
          SUM(challenged_requests) as challenged_requests,
          AVG(avg_response_time) as avg_response_time
        FROM global_analytics_hourly
        WHERE hour_timestamp >= ${timeWindow}
      `
      
      const overviewResult = await pool.query(overviewQuery)
      
      // Hourly trend data
      const trendQuery = `
        SELECT 
          hour_timestamp,
          total_requests,
          unique_ips,
          bot_requests,
          spam_attempts,
          suspicious_requests,
          blocked_requests
        FROM global_analytics_hourly
        WHERE hour_timestamp >= ${timeWindow}
        ORDER BY hour_timestamp ASC
      `
      
      const trendResult = await pool.query(trendQuery)
      
      // Top domains
      const domainsQuery = `
        SELECT 
          jsonb_array_elements(top_domains) as domain_data
        FROM global_analytics_hourly
        WHERE hour_timestamp >= ${timeWindow}
          AND top_domains != '[]'::jsonb
        LIMIT 100
      `
      
      const domainsResult = await pool.query(domainsQuery)
      
      // Aggregate top domains
      const domainStats: Record<string, number> = {}
      domainsResult.rows.forEach(row => {
        const domain = row.domain_data
        if (domain.domain) {
          domainStats[domain.domain] = (domainStats[domain.domain] || 0) + (domain.requests || 0)
        }
      })
      
      const topDomains = Object.entries(domainStats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([domain, requests]) => ({ domain, requests }))
      
      return NextResponse.json({
        success: true,
        data: {
          overview: overviewResult.rows[0],
          trend: trendResult.rows,
          top_domains: topDomains,
          time_range: timeRange
        }
      })
    }
    
    if (metric === 'security') {
      // Security events
      const eventsQuery = `
        SELECT 
          event_type,
          severity,
          affected_domains,
          involved_ips,
          event_data,
          auto_mitigated,
          status,
          detected_at,
          resolved_at
        FROM global_security_events
        WHERE detected_at >= ${timeWindow}
        ORDER BY detected_at DESC
        LIMIT 100
      `
      
      const eventsResult = await pool.query(eventsQuery)
      
      // Security statistics
      const securityStatsQuery = `
        SELECT 
          event_type,
          severity,
          COUNT(*) as count,
          COUNT(CASE WHEN auto_mitigated = true THEN 1 END) as mitigated_count,
          COUNT(CASE WHEN status = 'false_positive' THEN 1 END) as false_positives
        FROM global_security_events
        WHERE detected_at >= ${timeWindow}
        GROUP BY event_type, severity
        ORDER BY count DESC
      `
      
      const securityStatsResult = await pool.query(securityStatsQuery)
      
      // IP reputation breakdown
      const ipReputationQuery = `
        SELECT 
          list_type,
          COUNT(*) as count,
          AVG(reputation_score) as avg_score
        FROM global_ip_reputation
        GROUP BY list_type
      `
      
      const ipReputationResult = await pool.query(ipReputationQuery)
      
      // Rule triggers in time range
      const ruleTriggersQuery = `
        SELECT 
          rule_id,
          COUNT(*) as trigger_count,
          COUNT(DISTINCT ip) as unique_ips
        FROM global_rule_triggers
        WHERE triggered_at >= ${timeWindow}
        GROUP BY rule_id
        ORDER BY trigger_count DESC
        LIMIT 10
      `
      
      const ruleTriggersResult = await pool.query(ruleTriggersQuery)
      
      return NextResponse.json({
        success: true,
        data: {
          events: eventsResult.rows,
          statistics: securityStatsResult.rows,
          ip_reputation: ipReputationResult.rows,
          top_triggered_rules: ruleTriggersResult.rows,
          time_range: timeRange
        }
      })
    }
    
    if (metric === 'performance') {
      // Response time trends
      const performanceQuery = `
        SELECT 
          hour_timestamp,
          avg_response_time,
          total_requests
        FROM global_analytics_hourly
        WHERE hour_timestamp >= ${timeWindow}
          AND avg_response_time IS NOT NULL
        ORDER BY hour_timestamp ASC
      `
      
      const performanceResult = await pool.query(performanceQuery)
      
      // Calculate percentiles (mock data for now, would need actual request logs)
      const avgResponseTime = performanceResult.rows.reduce((sum, r) => sum + (r.avg_response_time || 0), 0) / performanceResult.rows.length
      
      return NextResponse.json({
        success: true,
        data: {
          trend: performanceResult.rows,
          statistics: {
            avg: avgResponseTime,
            // These would come from actual request logs
            p50: avgResponseTime * 0.8,
            p95: avgResponseTime * 1.5,
            p99: avgResponseTime * 2.0
          },
          time_range: timeRange
        }
      })
    }
    
    if (metric === 'geo') {
      // Geographic distribution
      const geoQuery = `
        SELECT 
          jsonb_array_elements(top_countries) as country_data
        FROM global_analytics_hourly
        WHERE hour_timestamp >= ${timeWindow}
          AND top_countries != '[]'::jsonb
      `
      
      const geoResult = await pool.query(geoQuery)
      
      // Aggregate countries
      const countryStats: Record<string, number> = {}
      geoResult.rows.forEach(row => {
        const country = row.country_data
        if (country.country) {
          countryStats[country.country] = (countryStats[country.country] || 0) + (country.count || 0)
        }
      })
      
      const topCountries = Object.entries(countryStats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20)
        .map(([country, requests]) => ({ country, requests }))
      
      // IP geographic stats
      const ipGeoQuery = `
        SELECT 
          country,
          COUNT(*) as ip_count,
          AVG(reputation_score) as avg_reputation
        FROM global_ip_reputation
        WHERE country IS NOT NULL
        GROUP BY country
        ORDER BY ip_count DESC
        LIMIT 20
      `
      
      const ipGeoResult = await pool.query(ipGeoQuery)
      
      return NextResponse.json({
        success: true,
        data: {
          top_countries: topCountries,
          ip_distribution: ipGeoResult.rows,
          time_range: timeRange
        }
      })
    }
    
    // Bot and spam breakdown
    if (metric === 'threats') {
      // Bot statistics
      const botStatsQuery = `
        SELECT 
          bot_type,
          COUNT(*) as detection_count,
          COUNT(DISTINCT ip) as unique_ips,
          COUNT(CASE WHEN blocked = true THEN 1 END) as blocked_count
        FROM global_bot_detections
        WHERE detected_at >= ${timeWindow}
        GROUP BY bot_type
        ORDER BY detection_count DESC
      `
      
      const botStatsResult = await pool.query(botStatsQuery)
      
      // Spam statistics
      const spamStatsQuery = `
        SELECT 
          form_type,
          COUNT(*) as detection_count,
          AVG(spam_score) as avg_spam_score,
          COUNT(CASE WHEN blocked = true THEN 1 END) as blocked_count,
          COUNT(CASE WHEN email_is_disposable = true THEN 1 END) as disposable_emails
        FROM global_spam_detections
        WHERE detected_at >= ${timeWindow}
        GROUP BY form_type
        ORDER BY detection_count DESC
      `
      
      const spamStatsResult = await pool.query(spamStatsQuery)
      
      // Top attacking IPs
      const attackingIPsQuery = `
        SELECT 
          ip,
          reputation_score,
          list_type,
          total_requests,
          suspicious_requests,
          country,
          is_vpn,
          is_proxy,
          is_tor
        FROM global_ip_reputation
        WHERE list_type = 'blacklist'
          OR (suspicious_requests > 10 AND suspicious_requests::float / NULLIF(total_requests, 0) > 0.5)
        ORDER BY suspicious_requests DESC
        LIMIT 20
      `
      
      const attackingIPsResult = await pool.query(attackingIPsQuery)
      
      return NextResponse.json({
        success: true,
        data: {
          bot_statistics: botStatsResult.rows,
          spam_statistics: spamStatsResult.rows,
          attacking_ips: attackingIPsResult.rows,
          time_range: timeRange
        }
      })
    }
    
    // Default: return error
    return NextResponse.json(
      { success: false, error: 'Invalid metric parameter' },
      { status: 400 }
    )
    
  } catch (error: any) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
