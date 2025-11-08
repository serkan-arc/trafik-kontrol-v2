/**
 * Networks Stats API
 * GET /api/networks/:id/stats - Get detailed network statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/networks/:id/stats
 * Get comprehensive statistics for a specific network
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
          message: 'Invalid network ID',
        },
        { status: 400 }
      );
    }

    // Check if network exists
    const networkCheck = await db.query(
      'SELECT id, name, status FROM networks WHERE id = $1',
      [id]
    );

    if (networkCheck.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Network not found',
        },
        { status: 404 }
      );
    }

    const network = networkCheck.rows[0];

    // Get comprehensive statistics
    const statsResult = await db.query(
      `SELECT 
        -- Total Metrics
        COUNT(l.id) as total_leads,
        COALESCE(SUM(l.network_cost), 0) as total_cost,
        COALESCE(AVG(l.network_cost), 0) as avg_cost_per_lead,
        
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
        
        CASE 
          WHEN COUNT(l.id) > 0 THEN 
            ROUND((COUNT(CASE WHEN l.status = 'rejected' THEN 1 END)::numeric / COUNT(l.id)::numeric) * 100, 2)
          ELSE 0 
        END as rejection_rate,
        
        -- Time Period Breakdown
        COUNT(CASE WHEN l.created_at >= CURRENT_DATE THEN 1 END) as leads_today,
        COUNT(CASE WHEN l.created_at >= CURRENT_DATE - INTERVAL '1 day' 
                   AND l.created_at < CURRENT_DATE THEN 1 END) as leads_yesterday,
        COUNT(CASE WHEN l.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as leads_this_week,
        COUNT(CASE WHEN l.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as leads_this_month,
        
        -- Cost Breakdown by Period
        COALESCE(SUM(CASE WHEN l.created_at >= CURRENT_DATE THEN l.network_cost END), 0) as cost_today,
        COALESCE(SUM(CASE WHEN l.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN l.network_cost END), 0) as cost_this_week,
        COALESCE(SUM(CASE WHEN l.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN l.network_cost END), 0) as cost_this_month
        
      FROM leads l
      WHERE l.network_id = $1`,
      [id]
    );

    // Get daily trend for last 30 days
    const trendResult = await db.query(
      `SELECT 
        DATE(l.created_at) as date,
        COUNT(l.id) as lead_count,
        COALESCE(SUM(l.network_cost), 0) as daily_cost,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as conversions
      FROM leads l
      WHERE l.network_id = $1 
        AND l.created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(l.created_at)
      ORDER BY date DESC`,
      [id]
    );

    // Get top performing campaigns from this network
    const campaignsResult = await db.query(
      `SELECT 
        l.campaign_id,
        c.name as campaign_name,
        COUNT(l.id) as lead_count,
        COALESCE(SUM(l.network_cost), 0) as total_cost,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as conversions
      FROM leads l
      LEFT JOIN campaigns c ON c.id = l.campaign_id
      WHERE l.network_id = $1 AND l.campaign_id IS NOT NULL
      GROUP BY l.campaign_id, c.name
      ORDER BY lead_count DESC
      LIMIT 10`,
      [id]
    );

    // Get quality metrics (average response time, data completeness)
    const qualityResult = await db.query(
      `SELECT 
        AVG(EXTRACT(EPOCH FROM (l.first_contact_at - l.created_at))/3600) as avg_response_hours,
        COUNT(CASE WHEN l.phone IS NOT NULL AND l.email IS NOT NULL THEN 1 END) as complete_data_count,
        COUNT(l.id) as total_count
      FROM leads l
      WHERE l.network_id = $1 AND l.first_contact_at IS NOT NULL`,
      [id]
    );

    const stats = statsResult.rows[0];
    const quality = qualityResult.rows[0];

    return NextResponse.json({
      success: true,
      network: {
        id: network.id,
        name: network.name,
        status: network.status,
      },
      stats: {
        // Total Metrics
        total_leads: parseInt(stats.total_leads),
        total_cost: parseFloat(stats.total_cost),
        avg_cost_per_lead: parseFloat(stats.avg_cost_per_lead),

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
        rejection_rate: parseFloat(stats.rejection_rate),

        // Time Period Metrics
        time_periods: {
          today: {
            leads: parseInt(stats.leads_today),
            cost: parseFloat(stats.cost_today),
          },
          yesterday: {
            leads: parseInt(stats.leads_yesterday),
          },
          this_week: {
            leads: parseInt(stats.leads_this_week),
            cost: parseFloat(stats.cost_this_week),
          },
          this_month: {
            leads: parseInt(stats.leads_this_month),
            cost: parseFloat(stats.cost_this_month),
          },
        },

        // Quality Metrics
        quality: {
          avg_response_hours: quality.avg_response_hours 
            ? parseFloat(quality.avg_response_hours).toFixed(2) 
            : null,
          data_completeness_rate: quality.total_count > 0
            ? ((parseInt(quality.complete_data_count) / parseInt(quality.total_count)) * 100).toFixed(2)
            : 0,
        },

        // Trends (last 30 days)
        daily_trend: trendResult.rows.map(row => ({
          date: row.date,
          leads: parseInt(row.lead_count),
          cost: parseFloat(row.daily_cost),
          conversions: parseInt(row.conversions),
        })),

        // Top Campaigns
        top_campaigns: campaignsResult.rows.map(row => ({
          campaign_id: row.campaign_id,
          campaign_name: row.campaign_name || 'Unknown',
          lead_count: parseInt(row.lead_count),
          total_cost: parseFloat(row.total_cost),
          conversions: parseInt(row.conversions),
        })),
      },
    });
  } catch (error) {
    console.error('Network stats error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error fetching network statistics',
      },
      { status: 500 }
    );
  }
}
