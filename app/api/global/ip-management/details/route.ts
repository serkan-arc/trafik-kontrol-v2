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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ip = searchParams.get('ip')

    if (!ip) {
      return NextResponse.json({
        success: false,
        error: 'IP address is required'
      }, { status: 400 })
    }

    // Get IP reputation details
    const ipQuery = `
      SELECT *
      FROM global_ip_reputation
      WHERE ip = $1
    `
    const ipResult = await pool.query(ipQuery, [ip])

    if (ipResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'IP not found'
      }, { status: 404 })
    }

    const ipData = ipResult.rows[0]

    // Get recent activity (last 7 days)
    const activityQuery = `
      SELECT 
        domain,
        hour_timestamp,
        request_count,
        suspicious_count,
        bot_score,
        triggered_rate_limit,
        triggered_rules
      FROM global_ip_activity
      WHERE ip = $1
        AND hour_timestamp >= NOW() - INTERVAL '7 days'
      ORDER BY hour_timestamp DESC
      LIMIT 100
    `
    const activityResult = await pool.query(activityQuery, [ip])

    // Get bot detections
    const botQuery = `
      SELECT 
        domain,
        bot_name,
        bot_type,
        bot_score,
        detection_method,
        action,
        blocked,
        detected_at
      FROM global_bot_detections
      WHERE ip = $1
      ORDER BY detected_at DESC
      LIMIT 50
    `
    const botResult = await pool.query(botQuery, [ip])

    // Get spam detections
    const spamQuery = `
      SELECT 
        domain,
        form_type,
        spam_score,
        matched_patterns,
        action,
        blocked,
        email,
        email_is_disposable,
        detected_at
      FROM global_spam_detections
      WHERE ip = $1
      ORDER BY detected_at DESC
      LIMIT 50
    `
    const spamResult = await pool.query(spamQuery, [ip])

    // Get rule triggers
    const rulesQuery = `
      SELECT 
        rule_name,
        domain,
        path,
        action,
        blocked,
        triggered_at
      FROM global_rule_triggers
      WHERE ip = $1
      ORDER BY triggered_at DESC
      LIMIT 50
    `
    const rulesResult = await pool.query(rulesQuery, [ip])

    // Get activity summary per domain
    const domainSummaryQuery = `
      SELECT 
        domain,
        SUM(request_count) as total_requests,
        SUM(suspicious_count) as total_suspicious,
        AVG(bot_score) as avg_bot_score,
        COUNT(DISTINCT DATE(hour_timestamp)) as active_days,
        MIN(hour_timestamp) as first_seen,
        MAX(hour_timestamp) as last_seen
      FROM global_ip_activity
      WHERE ip = $1
      GROUP BY domain
      ORDER BY total_requests DESC
    `
    const domainSummaryResult = await pool.query(domainSummaryQuery, [ip])

    // Calculate threat level
    const calculateThreatLevel = (score: number) => {
      if (score < 30) return 'low'
      if (score < 50) return 'medium'
      if (score < 70) return 'high'
      return 'critical'
    }

    return NextResponse.json({
      success: true,
      data: {
        ip_info: {
          ...ipData,
          threat_level: calculateThreatLevel(ipData.reputation_score)
        },
        recent_activity: activityResult.rows,
        bot_detections: botResult.rows,
        spam_detections: spamResult.rows,
        rule_triggers: rulesResult.rows,
        domain_summary: domainSummaryResult.rows,
        statistics: {
          total_domains: domainSummaryResult.rows.length,
          total_bot_detections: botResult.rows.length,
          total_spam_attempts: spamResult.rows.length,
          total_rule_violations: rulesResult.rows.length
        }
      }
    })

  } catch (error: any) {
    console.error('Error fetching IP details:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
