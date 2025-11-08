/**
 * Campaign Statistics API
 * GET /api/campaigns/:id/stats - Get detailed campaign statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/campaigns/:id/stats
 * Get comprehensive statistics for a specific campaign
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
          message: 'Invalid campaign ID',
        },
        { status: 400 }
      );
    }

    // Check if campaign exists
    const campaignCheck = await db.query(
      `SELECT id, name, status, campaign_type, budget, budget_currency, 
              start_date, end_date, target_leads, target_conversions
       FROM campaigns WHERE id = $1`,
      [id]
    );

    if (campaignCheck.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Campaign not found',
        },
        { status: 404 }
      );
    }

    const campaign = campaignCheck.rows[0];

    // Get comprehensive statistics
    const statsResult = await db.query(
      `SELECT 
        -- Total Metrics
        COUNT(l.id) as total_leads,
        COALESCE(SUM(l.network_cost), 0) as total_spent,
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
        COALESCE(SUM(CASE WHEN l.created_at >= CURRENT_DATE THEN l.network_cost END), 0) as cost_today,
        
        COUNT(CASE WHEN l.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as leads_this_week,
        COALESCE(SUM(CASE WHEN l.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN l.network_cost END), 0) as cost_this_week,
        
        COUNT(CASE WHEN l.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as leads_this_month,
        COALESCE(SUM(CASE WHEN l.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN l.network_cost END), 0) as cost_this_month
        
      FROM leads l
      WHERE l.campaign_id = $1`,
      [id]
    );

    // Get daily trend for campaign duration or last 30 days
    const trendResult = await db.query(
      `SELECT 
        DATE(l.created_at) as date,
        COUNT(l.id) as lead_count,
        COALESCE(SUM(l.network_cost), 0) as daily_cost,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as conversions
      FROM leads l
      WHERE l.campaign_id = $1 
        AND l.created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(l.created_at)
      ORDER BY date DESC`,
      [id]
    );

    // Get traffic sources breakdown
    const sourcesResult = await db.query(
      `SELECT 
        COALESCE(l.utm_source, 'direct') as source,
        COUNT(l.id) as lead_count,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as conversions,
        COALESCE(SUM(l.network_cost), 0) as total_cost
      FROM leads l
      WHERE l.campaign_id = $1
      GROUP BY COALESCE(l.utm_source, 'direct')
      ORDER BY lead_count DESC
      LIMIT 10`,
      [id]
    );

    // Get network distribution (if multiple networks)
    const networksResult = await db.query(
      `SELECT 
        n.name as network_name,
        COUNT(l.id) as lead_count,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as conversions,
        COALESCE(SUM(l.network_cost), 0) as total_cost
      FROM leads l
      LEFT JOIN networks n ON n.id = l.network_id
      WHERE l.campaign_id = $1
      GROUP BY n.id, n.name
      ORDER BY lead_count DESC`,
      [id]
    );

    const stats = statsResult.rows[0];
    const totalLeads = parseInt(stats.total_leads);
    const totalSpent = parseFloat(stats.total_spent);
    const totalConversions = parseInt(stats.converted_leads);
    const budget = parseFloat(campaign.budget || 0);

    // Calculate ROI and performance metrics
    const performance = {
      // Budget metrics
      budget: budget,
      total_spent: totalSpent,
      remaining_budget: budget - totalSpent,
      budget_used_percentage: budget > 0 ? ((totalSpent / budget) * 100).toFixed(2) : '0.00',
      
      // Target metrics
      target_leads: parseInt(campaign.target_leads || 0),
      target_conversions: parseInt(campaign.target_conversions || 0),
      leads_completion: campaign.target_leads > 0 
        ? ((totalLeads / parseInt(campaign.target_leads)) * 100).toFixed(2) 
        : '0.00',
      conversions_completion: campaign.target_conversions > 0
        ? ((totalConversions / parseInt(campaign.target_conversions)) * 100).toFixed(2)
        : '0.00',
      
      // Cost metrics
      cost_per_lead: totalLeads > 0 ? (totalSpent / totalLeads).toFixed(2) : '0.00',
      cost_per_conversion: totalConversions > 0 ? (totalSpent / totalConversions).toFixed(2) : '0.00',
      
      // Campaign duration
      days_running: campaign.start_date 
        ? Math.floor((new Date().getTime() - new Date(campaign.start_date).getTime()) / (1000 * 60 * 60 * 24))
        : 0,
      days_remaining: campaign.end_date
        ? Math.max(0, Math.floor((new Date(campaign.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
        : null,
    };

    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        campaign_type: campaign.campaign_type,
        start_date: campaign.start_date,
        end_date: campaign.end_date,
      },
      stats: {
        // Total Metrics
        total_leads: totalLeads,
        total_spent: totalSpent,
        avg_cost_per_lead: parseFloat(stats.avg_cost_per_lead),
        total_conversions: totalConversions,

        // Status Distribution
        status_breakdown: {
          new: parseInt(stats.new_leads),
          contacted: parseInt(stats.contacted_leads),
          qualified: parseInt(stats.qualified_leads),
          converted: totalConversions,
          rejected: parseInt(stats.rejected_leads),
        },

        // Performance Metrics
        conversion_rate: parseFloat(stats.conversion_rate),
        rejection_rate: parseFloat(stats.rejection_rate),
        
        // Performance Analysis
        performance,

        // Time Period Metrics
        time_periods: {
          today: {
            leads: parseInt(stats.leads_today),
            cost: parseFloat(stats.cost_today),
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

        // Trends (last 30 days)
        daily_trend: trendResult.rows.map(row => ({
          date: row.date,
          leads: parseInt(row.lead_count),
          cost: parseFloat(row.daily_cost),
          conversions: parseInt(row.conversions),
        })),

        // Traffic Sources
        traffic_sources: sourcesResult.rows.map(row => ({
          source: row.source,
          leads: parseInt(row.lead_count),
          conversions: parseInt(row.conversions),
          total_cost: parseFloat(row.total_cost),
          conversion_rate: row.lead_count > 0
            ? ((parseInt(row.conversions) / parseInt(row.lead_count)) * 100).toFixed(2)
            : '0.00',
        })),

        // Network Distribution
        network_distribution: networksResult.rows.map(row => ({
          network: row.network_name || 'Direct',
          leads: parseInt(row.lead_count),
          conversions: parseInt(row.conversions),
          total_cost: parseFloat(row.total_cost),
        })),
      },
    });
  } catch (error) {
    console.error('Campaign stats error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error fetching campaign statistics',
      },
      { status: 500 }
    );
  }
}
