/**
 * Site Statistics API
 * GET /api/sites/:id/stats - Get detailed site statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/sites/:id/stats
 * Get comprehensive statistics for a specific site
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Validate ID
    if (isNaN(Number(id))) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid site ID',
        },
        { status: 400 }
      );
    }

    // Check if site exists
    const siteCheck = await db.query(
      'SELECT id, name, url, status, tracking_code FROM sites WHERE id = $1',
      [id]
    );

    if (siteCheck.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Site not found',
        },
        { status: 404 }
      );
    }

    const site = siteCheck.rows[0];

    // Get comprehensive statistics
    const statsResult = await db.query(
      `SELECT 
        -- Total Metrics
        COUNT(l.id) as total_leads,
        
        -- Status Breakdown
        COUNT(CASE WHEN l.status = 'new' THEN 1 END) as new_leads,
        COUNT(CASE WHEN l.status = 'contacted' THEN 1 END) as contacted_leads,
        COUNT(CASE WHEN l.status = 'qualified' THEN 1 END) as qualified_leads,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as converted_leads,
        COUNT(CASE WHEN l.status = 'rejected' THEN 1 END) as rejected_leads,
        
        -- Conversion Metrics
        CASE 
          WHEN COUNT(l.id) > 0 THEN 
            ROUND((COUNT(CASE WHEN l.status = 'converted' THEN 1 END)::numeric / COUNT(l.id)::numeric) * 100, 2)
          ELSE 0 
        END as conversion_rate,
        
        -- Time Period Breakdown
        COUNT(CASE WHEN l.created_at >= CURRENT_DATE THEN 1 END) as leads_today,
        COUNT(CASE WHEN l.created_at >= CURRENT_DATE - INTERVAL '1 day' 
                   AND l.created_at < CURRENT_DATE THEN 1 END) as leads_yesterday,
        COUNT(CASE WHEN l.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as leads_this_week,
        COUNT(CASE WHEN l.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as leads_this_month,
        
        -- Quality Metrics
        COUNT(CASE WHEN l.email IS NOT NULL THEN 1 END) as leads_with_email,
        COUNT(CASE WHEN l.phone IS NOT NULL THEN 1 END) as leads_with_phone
        
      FROM leads l
      WHERE l.site_id = $1`,
      [id]
    );

    // Get daily trend for last 30 days
    const trendResult = await db.query(
      `SELECT 
        DATE(l.created_at) as date,
        COUNT(l.id) as lead_count,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as conversions
      FROM leads l
      WHERE l.site_id = $1 
        AND l.created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(l.created_at)
      ORDER BY date DESC`,
      [id]
    );

    // Get hourly distribution (for today)
    const hourlyResult = await db.query(
      `SELECT 
        EXTRACT(HOUR FROM l.created_at) as hour,
        COUNT(l.id) as lead_count
      FROM leads l
      WHERE l.site_id = $1 
        AND DATE(l.created_at) = CURRENT_DATE
      GROUP BY EXTRACT(HOUR FROM l.created_at)
      ORDER BY hour`,
      [id]
    );

    // Get traffic sources (UTM tracking)
    const sourcesResult = await db.query(
      `SELECT 
        COALESCE(l.utm_source, 'direct') as source,
        COUNT(l.id) as lead_count,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as conversions
      FROM leads l
      WHERE l.site_id = $1 
        AND l.created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY COALESCE(l.utm_source, 'direct')
      ORDER BY lead_count DESC
      LIMIT 10`,
      [id]
    );

    // Get visitor tracking data (if tracking table exists)
    const visitorStatsResult = await db.query(
      `SELECT 
        COUNT(DISTINCT session_id) as unique_visitors,
        COUNT(*) as total_pageviews,
        AVG(time_on_page) as avg_time_on_page
      FROM site_tracking
      WHERE site_id = $1 
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'`,
      [id]
    ).catch(() => ({ rows: [{ unique_visitors: 0, total_pageviews: 0, avg_time_on_page: 0 }] }));

    const stats = statsResult.rows[0];
    const visitorStats = visitorStatsResult.rows[0];

    // Calculate conversion funnel
    const totalLeads = parseInt(stats.total_leads);
    const conversionFunnel = {
      visitors: parseInt(visitorStats.unique_visitors) || totalLeads * 10, // Estimate if no tracking
      leads: totalLeads,
      contacted: parseInt(stats.contacted_leads) + parseInt(stats.qualified_leads) + parseInt(stats.converted_leads),
      qualified: parseInt(stats.qualified_leads) + parseInt(stats.converted_leads),
      converted: parseInt(stats.converted_leads),
      conversion_rate_visitor_to_lead: visitorStats.unique_visitors > 0
        ? ((totalLeads / parseInt(visitorStats.unique_visitors)) * 100).toFixed(2)
        : '0.00',
      conversion_rate_lead_to_sale: parseFloat(stats.conversion_rate).toFixed(2),
    };

    return NextResponse.json({
      success: true,
      site: {
        id: site.id,
        name: site.name,
        url: site.url,
        status: site.status,
        tracking_code: site.tracking_code,
      },
      stats: {
        // Total Metrics
        total_leads: parseInt(stats.total_leads),
        unique_visitors: parseInt(visitorStats.unique_visitors),
        total_pageviews: parseInt(visitorStats.total_pageviews),
        avg_time_on_page: parseFloat(visitorStats.avg_time_on_page || 0).toFixed(2),

        // Status Distribution
        status_breakdown: {
          new: parseInt(stats.new_leads),
          contacted: parseInt(stats.contacted_leads),
          qualified: parseInt(stats.qualified_leads),
          converted: parseInt(stats.converted_leads),
          rejected: parseInt(stats.rejected_leads),
        },

        // Performance Metrics
        conversion_rate: parseFloat(stats.conversion_rate),
        leads_with_email_rate: totalLeads > 0 
          ? ((parseInt(stats.leads_with_email) / totalLeads) * 100).toFixed(2)
          : '0.00',
        leads_with_phone_rate: totalLeads > 0
          ? ((parseInt(stats.leads_with_phone) / totalLeads) * 100).toFixed(2)
          : '0.00',

        // Time Period Metrics
        time_periods: {
          today: parseInt(stats.leads_today),
          yesterday: parseInt(stats.leads_yesterday),
          this_week: parseInt(stats.leads_this_week),
          this_month: parseInt(stats.leads_this_month),
        },

        // Conversion Funnel
        conversion_funnel: conversionFunnel,

        // Trends (last 30 days)
        daily_trend: trendResult.rows.map(row => ({
          date: row.date,
          leads: parseInt(row.lead_count),
          conversions: parseInt(row.conversions),
        })),

        // Hourly Distribution (today)
        hourly_distribution: hourlyResult.rows.map(row => ({
          hour: parseInt(row.hour),
          leads: parseInt(row.lead_count),
        })),

        // Traffic Sources
        traffic_sources: sourcesResult.rows.map(row => ({
          source: row.source,
          leads: parseInt(row.lead_count),
          conversions: parseInt(row.conversions),
          conversion_rate: row.lead_count > 0
            ? ((parseInt(row.conversions) / parseInt(row.lead_count)) * 100).toFixed(2)
            : '0.00',
        })),
      },
    });
  } catch (error) {
    console.error('Site stats error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error fetching site statistics',
      },
      { status: 500 }
    );
  }
}
