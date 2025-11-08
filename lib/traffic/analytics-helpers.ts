/**
 * Traffic Analytics Helper Functions
 * 
 * Statistical analysis and data aggregation for traffic insights
 */

import { db } from '@/lib/db';

export interface TimeRange {
  days?: number;
  hours?: number;
  from?: Date;
  to?: Date;
}

/**
 * Get dashboard statistics overview
 */
export async function getDashboardStats(timeRange: TimeRange = { days: 7 }) {
  try {
    const whereClause = buildTimeRangeClause(timeRange);

    // Total IPs
    const totalIPsResult = await db.query(`
      SELECT COUNT(DISTINCT ip) as total
      FROM ip_tracking
      ${whereClause}
    `);

    // New IPs in time range
    const newIPsResult = await db.query(`
      SELECT COUNT(DISTINCT ip) as total
      FROM ip_tracking
      WHERE created_at > NOW() - INTERVAL '${timeRange.days || 7} days'
    `);

    // Total visits
    const visitsResult = await db.query(`
      SELECT 
        COUNT(*) as total_visits,
        COUNT(DISTINCT ip) as unique_visitors
      FROM ip_visit_history
      WHERE visit_timestamp > NOW() - INTERVAL '${timeRange.days || 7} days'
    `);

    // Form submissions
    const formsResult = await db.query(`
      SELECT 
        COUNT(*) as total_submissions,
        COUNT(*) FILTER (WHERE is_spam = true) as spam_submissions,
        COUNT(DISTINCT ip) as unique_submitters
      FROM form_submission_history
      WHERE submitted_at > NOW() - INTERVAL '${timeRange.days || 7} days'
    `);

    // List status distribution
    const listsResult = await db.query(`
      SELECT 
        list_status,
        COUNT(*) as count
      FROM ip_tracking
      ${whereClause}
      GROUP BY list_status
    `);

    // Risk score distribution
    const riskResult = await db.query(`
      SELECT 
        CASE 
          WHEN risk_score >= 80 THEN 'critical'
          WHEN risk_score >= 50 THEN 'high'
          WHEN risk_score >= 30 THEN 'medium'
          ELSE 'low'
        END as risk_level,
        COUNT(*) as count,
        AVG(risk_score) as avg_score
      FROM ip_tracking
      ${whereClause}
      GROUP BY risk_level
      ORDER BY avg_score DESC
    `);

    // Bot detections
    const botsResult = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE dns_verified = true) as verified_bots,
        COUNT(*) FILTER (WHERE dns_verified = false AND claims_to_be_bot = true) as fake_bots,
        COUNT(DISTINCT bot_type) as bot_types
      FROM ip_user_agent_history
      WHERE first_seen > NOW() - INTERVAL '${timeRange.days || 7} days'
    `);

    const listDistribution = listsResult.rows.reduce((acc: any, row: any) => {
      acc[row.list_status] = parseInt(row.count);
      return acc;
    }, {});

    const riskDistribution = riskResult.rows.reduce((acc: any, row: any) => {
      acc[row.risk_level] = {
        count: parseInt(row.count),
        avg_score: parseFloat(row.avg_score || 0)
      };
      return acc;
    }, {});

    return {
      overview: {
        total_ips: parseInt(totalIPsResult.rows[0]?.total || 0),
        new_ips: parseInt(newIPsResult.rows[0]?.total || 0),
        total_visits: parseInt(visitsResult.rows[0]?.total_visits || 0),
        unique_visitors: parseInt(visitsResult.rows[0]?.unique_visitors || 0),
        total_form_submissions: parseInt(formsResult.rows[0]?.total_submissions || 0),
        spam_submissions: parseInt(formsResult.rows[0]?.spam_submissions || 0),
        unique_form_submitters: parseInt(formsResult.rows[0]?.unique_submitters || 0)
      },
      lists: listDistribution,
      risk_levels: riskDistribution,
      bots: {
        verified: parseInt(botsResult.rows[0]?.verified_bots || 0),
        fake: parseInt(botsResult.rows[0]?.fake_bots || 0),
        types: parseInt(botsResult.rows[0]?.bot_types || 0)
      },
      time_range: timeRange
    };
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    throw error;
  }
}

/**
 * Get time series data (hourly or daily)
 */
export async function getTimeSeries(
  metric: 'visits' | 'ips' | 'forms' | 'spam' | 'risk',
  granularity: 'hour' | 'day' = 'day',
  timeRange: TimeRange = { days: 7 }
) {
  try {
    const timeFormat = granularity === 'hour' 
      ? "to_char(DATE_TRUNC('hour', created_at), 'YYYY-MM-DD HH24:00')"
      : "to_char(DATE_TRUNC('day', created_at), 'YYYY-MM-DD')";

    let query = '';
    const interval = `${timeRange.days || 7} days`;

    switch (metric) {
      case 'visits':
        query = `
          SELECT 
            ${timeFormat.replace('created_at', 'visit_timestamp')} as time_bucket,
            COUNT(*) as value,
            COUNT(DISTINCT ip) as unique_count
          FROM ip_visit_history
          WHERE visit_timestamp > NOW() - INTERVAL '${interval}'
          GROUP BY time_bucket
          ORDER BY time_bucket ASC
        `;
        break;

      case 'ips':
        query = `
          SELECT 
            ${timeFormat} as time_bucket,
            COUNT(DISTINCT ip) as value
          FROM ip_tracking
          WHERE created_at > NOW() - INTERVAL '${interval}'
          GROUP BY time_bucket
          ORDER BY time_bucket ASC
        `;
        break;

      case 'forms':
        query = `
          SELECT 
            ${timeFormat} as time_bucket,
            COUNT(*) as value,
            COUNT(*) FILTER (WHERE is_spam = true) as spam_count
          FROM form_submission_history
          WHERE submitted_at > NOW() - INTERVAL '${interval}'
          GROUP BY time_bucket
          ORDER BY time_bucket ASC
        `;
        break;

      case 'spam':
        query = `
          SELECT 
            ${timeFormat} as time_bucket,
            COUNT(*) as value,
            AVG(spam_score) as avg_score
          FROM form_submission_history
          WHERE submitted_at > NOW() - INTERVAL '${interval}'
            AND is_spam = true
          GROUP BY time_bucket
          ORDER BY time_bucket ASC
        `;
        break;

      case 'risk':
        query = `
          SELECT 
            ${timeFormat} as time_bucket,
            AVG(risk_score) as value,
            MAX(risk_score) as max_score,
            MIN(risk_score) as min_score
          FROM ip_tracking
          WHERE updated_at > NOW() - INTERVAL '${interval}'
          GROUP BY time_bucket
          ORDER BY time_bucket ASC
        `;
        break;
    }

    const result = await db.query(query);

    return {
      metric,
      granularity,
      data: result.rows.map((row: any) => ({
        time: row.time_bucket,
        value: parseFloat(row.value || 0),
        ...(row.unique_count && { unique_count: parseInt(row.unique_count) }),
        ...(row.spam_count !== undefined && { spam_count: parseInt(row.spam_count) }),
        ...(row.avg_score !== undefined && { avg_score: parseFloat(row.avg_score || 0) }),
        ...(row.max_score !== undefined && { max_score: parseFloat(row.max_score || 0) }),
        ...(row.min_score !== undefined && { min_score: parseFloat(row.min_score || 0) })
      })),
      time_range: timeRange
    };
  } catch (error) {
    console.error('Error in getTimeSeries:', error);
    throw error;
  }
}

/**
 * Get geographic distribution
 */
export async function getGeographicStats(timeRange: TimeRange = { days: 7 }) {
  try {
    const whereClause = buildTimeRangeClause(timeRange);

    // Country distribution
    const countryResult = await db.query(`
      SELECT 
        country,
        country_name,
        COUNT(*) as ip_count,
        SUM(visit_count) as total_visits,
        SUM(form_submissions) as total_forms,
        AVG(risk_score) as avg_risk_score,
        COUNT(*) FILTER (WHERE list_status = 'blacklist') as blacklisted,
        COUNT(*) FILTER (WHERE list_status = 'graylist') as graylisted
      FROM ip_tracking
      ${whereClause}
        AND country IS NOT NULL
      GROUP BY country, country_name
      ORDER BY ip_count DESC
      LIMIT 50
    `);

    // City distribution (top cities)
    const cityResult = await db.query(`
      SELECT 
        city,
        country,
        COUNT(*) as ip_count,
        SUM(visit_count) as total_visits,
        AVG(risk_score) as avg_risk_score
      FROM ip_tracking
      ${whereClause}
        AND city IS NOT NULL
      GROUP BY city, country
      ORDER BY ip_count DESC
      LIMIT 20
    `);

    return {
      countries: countryResult.rows.map((row: any) => ({
        country: row.country,
        country_name: row.country_name,
        ip_count: parseInt(row.ip_count),
        total_visits: parseInt(row.total_visits || 0),
        total_forms: parseInt(row.total_forms || 0),
        avg_risk_score: parseFloat(row.avg_risk_score || 0),
        blacklisted: parseInt(row.blacklisted || 0),
        graylisted: parseInt(row.graylisted || 0)
      })),
      cities: cityResult.rows.map((row: any) => ({
        city: row.city,
        country: row.country,
        ip_count: parseInt(row.ip_count),
        total_visits: parseInt(row.total_visits || 0),
        avg_risk_score: parseFloat(row.avg_risk_score || 0)
      })),
      time_range: timeRange
    };
  } catch (error) {
    console.error('Error in getGeographicStats:', error);
    throw error;
  }
}

/**
 * Get device distribution statistics
 */
export async function getDeviceStats(timeRange: TimeRange = { days: 7 }) {
  try {
    const whereClause = buildTimeRangeClause(timeRange);

    // Device type distribution
    const deviceResult = await db.query(`
      SELECT 
        device_type,
        COUNT(*) as ip_count,
        SUM(visit_count) as total_visits,
        SUM(form_submissions) as total_forms,
        AVG(risk_score) as avg_risk_score,
        COUNT(*) FILTER (WHERE list_status = 'blacklist') as blacklisted
      FROM ip_tracking
      ${whereClause}
        AND device_type IS NOT NULL
      GROUP BY device_type
      ORDER BY ip_count DESC
    `);

    // OS distribution
    const osResult = await db.query(`
      SELECT 
        os,
        COUNT(*) as ip_count,
        SUM(visit_count) as total_visits
      FROM ip_tracking
      ${whereClause}
        AND os IS NOT NULL
      GROUP BY os
      ORDER BY ip_count DESC
      LIMIT 10
    `);

    // Browser distribution
    const browserResult = await db.query(`
      SELECT 
        browser,
        COUNT(*) as ip_count,
        SUM(visit_count) as total_visits
      FROM ip_tracking
      ${whereClause}
        AND browser IS NOT NULL
      GROUP BY browser
      ORDER BY ip_count DESC
      LIMIT 10
    `);

    return {
      devices: deviceResult.rows.map((row: any) => ({
        device_type: row.device_type,
        ip_count: parseInt(row.ip_count),
        total_visits: parseInt(row.total_visits || 0),
        total_forms: parseInt(row.total_forms || 0),
        avg_risk_score: parseFloat(row.avg_risk_score || 0),
        blacklisted: parseInt(row.blacklisted || 0)
      })),
      operating_systems: osResult.rows.map((row: any) => ({
        os: row.os,
        ip_count: parseInt(row.ip_count),
        total_visits: parseInt(row.total_visits || 0)
      })),
      browsers: browserResult.rows.map((row: any) => ({
        browser: row.browser,
        ip_count: parseInt(row.ip_count),
        total_visits: parseInt(row.total_visits || 0)
      })),
      time_range: timeRange
    };
  } catch (error) {
    console.error('Error in getDeviceStats:', error);
    throw error;
  }
}

/**
 * Get risk score trends
 */
export async function getRiskTrends(timeRange: TimeRange = { days: 7 }) {
  try {
    const interval = `${timeRange.days || 7} days`;

    // Risk score over time
    const trendResult = await db.query(`
      SELECT 
        to_char(DATE_TRUNC('day', updated_at), 'YYYY-MM-DD') as date,
        AVG(risk_score) as avg_risk,
        MAX(risk_score) as max_risk,
        MIN(risk_score) as min_risk,
        COUNT(*) FILTER (WHERE risk_score >= 80) as critical_count,
        COUNT(*) FILTER (WHERE risk_score >= 50 AND risk_score < 80) as high_count,
        COUNT(*) FILTER (WHERE risk_score >= 30 AND risk_score < 50) as medium_count,
        COUNT(*) FILTER (WHERE risk_score < 30) as low_count
      FROM ip_tracking
      WHERE updated_at > NOW() - INTERVAL '${interval}'
      GROUP BY date
      ORDER BY date ASC
    `);

    // Current risk distribution
    const distributionResult = await db.query(`
      SELECT 
        CASE 
          WHEN risk_score >= 80 THEN 'critical'
          WHEN risk_score >= 50 THEN 'high'
          WHEN risk_score >= 30 THEN 'medium'
          ELSE 'low'
        END as risk_level,
        COUNT(*) as count,
        AVG(risk_score) as avg_score
      FROM ip_tracking
      WHERE updated_at > NOW() - INTERVAL '${interval}'
      GROUP BY risk_level
      ORDER BY avg_score DESC
    `);

    return {
      trend: trendResult.rows.map((row: any) => ({
        date: row.date,
        avg_risk: parseFloat(row.avg_risk || 0),
        max_risk: parseFloat(row.max_risk || 0),
        min_risk: parseFloat(row.min_risk || 0),
        critical_count: parseInt(row.critical_count || 0),
        high_count: parseInt(row.high_count || 0),
        medium_count: parseInt(row.medium_count || 0),
        low_count: parseInt(row.low_count || 0)
      })),
      distribution: distributionResult.rows.map((row: any) => ({
        risk_level: row.risk_level,
        count: parseInt(row.count),
        avg_score: parseFloat(row.avg_score || 0)
      })),
      time_range: timeRange
    };
  } catch (error) {
    console.error('Error in getRiskTrends:', error);
    throw error;
  }
}

/**
 * Get top IPs by various metrics
 */
export async function getTopIPs(
  metric: 'visits' | 'forms' | 'risk' | 'spam',
  limit: number = 20,
  timeRange: TimeRange = { days: 7 }
) {
  try {
    const whereClause = buildTimeRangeClause(timeRange);

    let orderBy = '';
    switch (metric) {
      case 'visits':
        orderBy = 'visit_count DESC';
        break;
      case 'forms':
        orderBy = 'form_submissions DESC';
        break;
      case 'risk':
        orderBy = 'risk_score DESC';
        break;
      case 'spam':
        orderBy = 'spam_score DESC';
        break;
    }

    const result = await db.query(`
      SELECT 
        ip,
        country,
        device_type,
        visit_count,
        form_submissions,
        same_form_spam_count,
        risk_score,
        spam_score,
        bot_score,
        list_status,
        first_seen,
        last_seen
      FROM ip_tracking
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $1
    `, [limit]);

    return {
      metric,
      top_ips: result.rows.map((row: any) => ({
        ip: row.ip,
        country: row.country,
        device_type: row.device_type,
        visit_count: parseInt(row.visit_count || 0),
        form_submissions: parseInt(row.form_submissions || 0),
        same_form_spam_count: parseInt(row.same_form_spam_count || 0),
        risk_score: parseInt(row.risk_score || 0),
        spam_score: parseInt(row.spam_score || 0),
        bot_score: parseInt(row.bot_score || 0),
        list_status: row.list_status,
        first_seen: row.first_seen,
        last_seen: row.last_seen
      })),
      time_range: timeRange,
      limit
    };
  } catch (error) {
    console.error('Error in getTopIPs:', error);
    throw error;
  }
}

/**
 * Get conversion funnel (visit → form submission)
 */
export async function getConversionFunnel(timeRange: TimeRange = { days: 7 }) {
  try {
    const interval = `${timeRange.days || 7} days`;

    // Total unique visitors
    const visitorsResult = await db.query(`
      SELECT COUNT(DISTINCT ip) as total
      FROM ip_visit_history
      WHERE visit_timestamp > NOW() - INTERVAL '${interval}'
    `);

    // Visitors who submitted forms
    const formSubmittersResult = await db.query(`
      SELECT COUNT(DISTINCT ip) as total
      FROM form_submission_history
      WHERE submitted_at > NOW() - INTERVAL '${interval}'
    `);

    // Non-spam form submitters
    const validSubmittersResult = await db.query(`
      SELECT COUNT(DISTINCT ip) as total
      FROM form_submission_history
      WHERE submitted_at > NOW() - INTERVAL '${interval}'
        AND is_spam = false
    `);

    // Whitelisted after form submission
    const whitelistedResult = await db.query(`
      SELECT COUNT(DISTINCT ip) as total
      FROM ip_tracking
      WHERE list_status = 'whitelist'
        AND updated_at > NOW() - INTERVAL '${interval}'
        AND form_submissions > 0
    `);

    const totalVisitors = parseInt(visitorsResult.rows[0]?.total || 0);
    const formSubmitters = parseInt(formSubmittersResult.rows[0]?.total || 0);
    const validSubmitters = parseInt(validSubmittersResult.rows[0]?.total || 0);
    const whitelisted = parseInt(whitelistedResult.rows[0]?.total || 0);

    return {
      funnel: [
        {
          stage: 'visitors',
          label: 'Total Visitors',
          count: totalVisitors,
          percentage: 100
        },
        {
          stage: 'form_submission',
          label: 'Form Submissions',
          count: formSubmitters,
          percentage: totalVisitors > 0 ? Math.round((formSubmitters / totalVisitors) * 100) : 0
        },
        {
          stage: 'valid_submission',
          label: 'Valid Submissions (Non-spam)',
          count: validSubmitters,
          percentage: totalVisitors > 0 ? Math.round((validSubmitters / totalVisitors) * 100) : 0
        },
        {
          stage: 'whitelisted',
          label: 'Whitelisted',
          count: whitelisted,
          percentage: totalVisitors > 0 ? Math.round((whitelisted / totalVisitors) * 100) : 0
        }
      ],
      conversion_rates: {
        visitor_to_form: totalVisitors > 0 ? ((formSubmitters / totalVisitors) * 100).toFixed(2) : '0.00',
        visitor_to_valid: totalVisitors > 0 ? ((validSubmitters / totalVisitors) * 100).toFixed(2) : '0.00',
        form_to_valid: formSubmitters > 0 ? ((validSubmitters / formSubmitters) * 100).toFixed(2) : '0.00',
        spam_rate: formSubmitters > 0 ? (((formSubmitters - validSubmitters) / formSubmitters) * 100).toFixed(2) : '0.00'
      },
      time_range: timeRange
    };
  } catch (error) {
    console.error('Error in getConversionFunnel:', error);
    throw error;
  }
}

/**
 * Helper: Build time range WHERE clause
 */
function buildTimeRangeClause(timeRange: TimeRange): string {
  if (timeRange.from && timeRange.to) {
    return `WHERE created_at BETWEEN '${timeRange.from.toISOString()}' AND '${timeRange.to.toISOString()}'`;
  } else if (timeRange.days) {
    return `WHERE created_at > NOW() - INTERVAL '${timeRange.days} days'`;
  } else if (timeRange.hours) {
    return `WHERE created_at > NOW() - INTERVAL '${timeRange.hours} hours'`;
  }
  return '';
}
