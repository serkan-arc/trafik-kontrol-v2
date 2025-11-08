import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import db from '@/lib/db';

/**
 * GET /api/analytics/dashboard
 * 
 * Ana dashboard istatistikleri:
 * - Bugün/Bu Hafta/Bu Ay/Toplam lead sayıları
 * - Conversion oranları ve satış metrikleri
 * - Network, Site, Campaign performans özeti
 * - Son aktiviteler ve trend analizleri
 * 
 * Query Parameters:
 * - date_range: (optional) today, week, month, year, custom
 * - start_date: (optional) YYYY-MM-DD format (for custom range)
 * - end_date: (optional) YYYY-MM-DD format (for custom range)
 * - compare: (optional) true/false - Önceki dönemle karşılaştırma
 */

const querySchema = z.object({
  date_range: z.enum(['today', 'week', 'month', 'year', 'custom']).optional().default('month'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  compare: z.enum(['true', 'false']).optional().default('false'),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = querySchema.parse({
      date_range: searchParams.get('date_range') || 'month',
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      compare: searchParams.get('compare') || 'false',
    });

    // Date range hesaplamaları
    let startDate: Date;
    let endDate = new Date();
    
    switch (query.date_range) {
      case 'today':
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'custom':
        if (!query.start_date || !query.end_date) {
          return NextResponse.json(
            { success: false, error: 'start_date and end_date required for custom range' },
            { status: 400 }
          );
        }
        startDate = new Date(query.start_date);
        endDate = new Date(query.end_date);
        break;
      default:
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
    }

    // Önceki dönem için date range (compare için)
    const periodDiff = endDate.getTime() - startDate.getTime();
    const prevStartDate = new Date(startDate.getTime() - periodDiff);
    const prevEndDate = new Date(startDate.getTime());

    // 1. Lead İstatistikleri (Mevcut Dönem)
    const leadsStatsResult = await db.query(
      `SELECT 
        COUNT(*) as total_leads,
        COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted_leads,
        COUNT(CASE WHEN status = 'qualified' THEN 1 END) as qualified_leads,
        COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contacted_leads,
        COUNT(CASE WHEN status = 'new' THEN 1 END) as new_leads,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_leads
      FROM leads 
      WHERE created_at >= $1 AND created_at <= $2`,
      [startDate, endDate]
    );

    // 2. Lead İstatistikleri (Önceki Dönem - karşılaştırma için)
    let prevLeadsStats = null;
    if (query.compare === 'true') {
      const prevLeadsStatsResult = await db.query(
        `SELECT 
          COUNT(*) as total_leads,
          COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted_leads
        FROM leads 
        WHERE created_at >= $1 AND created_at < $2`,
        [prevStartDate, prevEndDate]
      );
      prevLeadsStats = prevLeadsStatsResult.rows[0];
    }

    const leadsStats = leadsStatsResult.rows[0];
    const conversionRate = leadsStats.total_leads > 0 
      ? ((parseInt(leadsStats.converted_leads) / parseInt(leadsStats.total_leads)) * 100).toFixed(2)
      : '0.00';

    // Karşılaştırma metrikleri
    let leadsComparison = null;
    if (query.compare === 'true' && prevLeadsStats) {
      const leadsChange = parseInt(leadsStats.total_leads) - parseInt(prevLeadsStats.total_leads);
      const leadsChangePercent = prevLeadsStats.total_leads > 0
        ? ((leadsChange / parseInt(prevLeadsStats.total_leads)) * 100).toFixed(2)
        : '0.00';
      
      const convChange = parseInt(leadsStats.converted_leads) - parseInt(prevLeadsStats.converted_leads);
      const convChangePercent = prevLeadsStats.converted_leads > 0
        ? ((convChange / parseInt(prevLeadsStats.converted_leads)) * 100).toFixed(2)
        : '0.00';

      leadsComparison = {
        leads_change: leadsChange,
        leads_change_percent: leadsChangePercent,
        conversions_change: convChange,
        conversions_change_percent: convChangePercent,
      };
    }

    // 3. Network Performans Özeti
    const networksStatsResult = await db.query(
      `SELECT 
        COUNT(DISTINCT n.id) as total_networks,
        COUNT(l.id) as total_leads_from_networks,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as converted_from_networks,
        COALESCE(SUM(n.cost_per_lead), 0) as total_cost
      FROM networks n
      LEFT JOIN leads l ON l.network_id = n.id 
        AND l.created_at >= $1 AND l.created_at <= $2
      WHERE n.status = 'active'`,
      [startDate, endDate]
    );

    const networksStats = networksStatsResult.rows[0];

    // Top 5 Networks
    const topNetworksResult = await db.query(
      `SELECT 
        n.id,
        n.name,
        COUNT(l.id) as lead_count,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as conversions,
        CASE 
          WHEN COUNT(l.id) > 0 THEN (COUNT(CASE WHEN l.status = 'converted' THEN 1 END)::float / COUNT(l.id) * 100)
          ELSE 0 
        END as conversion_rate,
        n.cost_per_lead * COUNT(l.id) as total_cost
      FROM networks n
      LEFT JOIN leads l ON l.network_id = n.id 
        AND l.created_at >= $1 AND l.created_at <= $2
      WHERE n.status = 'active'
      GROUP BY n.id, n.name, n.cost_per_lead
      ORDER BY lead_count DESC
      LIMIT 5`,
      [startDate, endDate]
    );

    // 4. Site Performans Özeti
    const sitesStatsResult = await db.query(
      `SELECT 
        COUNT(DISTINCT s.id) as total_sites,
        COUNT(l.id) as total_leads_from_sites,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as converted_from_sites
      FROM sites s
      LEFT JOIN leads l ON l.site_id = s.id 
        AND l.created_at >= $1 AND l.created_at <= $2
      WHERE s.is_active = true`,
      [startDate, endDate]
    );

    const sitesStats = sitesStatsResult.rows[0];

    // Top 5 Sites
    const topSitesResult = await db.query(
      `SELECT 
        s.id,
        s.name,
        s.url,
        COUNT(l.id) as lead_count,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as conversions,
        CASE 
          WHEN COUNT(l.id) > 0 THEN (COUNT(CASE WHEN l.status = 'converted' THEN 1 END)::float / COUNT(l.id) * 100)
          ELSE 0 
        END as conversion_rate
      FROM sites s
      LEFT JOIN leads l ON l.site_id = s.id 
        AND l.created_at >= $1 AND l.created_at <= $2
      WHERE s.is_active = true
      GROUP BY s.id, s.name, s.url
      ORDER BY lead_count DESC
      LIMIT 5`,
      [startDate, endDate]
    );

    // 5. Campaign Performans Özeti
    const campaignsStatsResult = await db.query(
      `SELECT 
        COUNT(DISTINCT c.id) as total_campaigns,
        COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) as active_campaigns,
        COUNT(l.id) as total_leads_from_campaigns,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as converted_from_campaigns,
        COALESCE(SUM(c.budget), 0) as total_budget,
        COALESCE(SUM(c.spent), 0) as total_spent
      FROM campaigns c
      LEFT JOIN leads l ON l.campaign_id = c.id 
        AND l.created_at >= $1 AND l.created_at <= $2`,
      [startDate, endDate]
    );

    const campaignsStats = campaignsStatsResult.rows[0];

    // Top 5 Campaigns
    const topCampaignsResult = await db.query(
      `SELECT 
        c.id,
        c.name,
        c.campaign_type,
        c.status,
        COUNT(l.id) as lead_count,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as conversions,
        CASE 
          WHEN COUNT(l.id) > 0 THEN (COUNT(CASE WHEN l.status = 'converted' THEN 1 END)::float / COUNT(l.id) * 100)
          ELSE 0 
        END as conversion_rate,
        c.budget,
        c.spent,
        CASE 
          WHEN c.spent > 0 AND COUNT(l.id) > 0 THEN (c.spent / COUNT(l.id))
          ELSE 0 
        END as cost_per_lead
      FROM campaigns c
      LEFT JOIN leads l ON l.campaign_id = c.id 
        AND l.created_at >= $1 AND l.created_at <= $2
      GROUP BY c.id, c.name, c.campaign_type, c.status, c.budget, c.spent
      ORDER BY lead_count DESC
      LIMIT 5`,
      [startDate, endDate]
    );

    // 6. Son 30 Günün Günlük Trend Analizi
    const dailyTrendsResult = await db.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as leads,
        COUNT(CASE WHEN status = 'converted' THEN 1 END) as conversions
      FROM leads
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC`,
      []
    );

    // 7. Lead Kaynakları Dağılımı
    const leadSourcesResult = await db.query(
      `SELECT 
        CASE 
          WHEN network_id IS NOT NULL THEN 'network'
          WHEN site_id IS NOT NULL THEN 'site'
          WHEN campaign_id IS NOT NULL THEN 'campaign'
          ELSE 'direct'
        END as source_type,
        COUNT(*) as count,
        COUNT(CASE WHEN status = 'converted' THEN 1 END) as conversions
      FROM leads
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY source_type`,
      [startDate, endDate]
    );

    // 8. Son Aktiviteler (Son 10 önemli aktivite)
    const recentActivitiesResult = await db.query(
      `SELECT 
        la.id,
        la.lead_id,
        la.activity_type,
        la.description,
        la.created_at,
        l.name as lead_name,
        l.status as lead_status
      FROM lead_activities la
      JOIN leads l ON l.id = la.lead_id
      WHERE la.activity_type IN ('status_change', 'call_log', 'assignment')
      ORDER BY la.created_at DESC
      LIMIT 10`,
      []
    );

    // Response hazırla
    const response = {
      success: true,
      data: {
        period: {
          date_range: query.date_range,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        },
        
        // Lead metrikleri
        leads: {
          total: parseInt(leadsStats.total_leads),
          converted: parseInt(leadsStats.converted_leads),
          qualified: parseInt(leadsStats.qualified_leads),
          contacted: parseInt(leadsStats.contacted_leads),
          new: parseInt(leadsStats.new_leads),
          rejected: parseInt(leadsStats.rejected_leads),
          conversion_rate: `${conversionRate}%`,
          comparison: leadsComparison,
        },

        // Network metrikleri
        networks: {
          total_active: parseInt(networksStats.total_networks),
          total_leads: parseInt(networksStats.total_leads_from_networks),
          conversions: parseInt(networksStats.converted_from_networks),
          total_cost: parseFloat(networksStats.total_cost),
          top_performers: topNetworksResult.rows.map(row => ({
            id: row.id,
            name: row.name,
            lead_count: parseInt(row.lead_count),
            conversions: parseInt(row.conversions),
            conversion_rate: `${parseFloat(row.conversion_rate).toFixed(2)}%`,
            total_cost: parseFloat(row.total_cost),
          })),
        },

        // Site metrikleri
        sites: {
          total_active: parseInt(sitesStats.total_sites),
          total_leads: parseInt(sitesStats.total_leads_from_sites),
          conversions: parseInt(sitesStats.converted_from_sites),
          top_performers: topSitesResult.rows.map(row => ({
            id: row.id,
            name: row.name,
            url: row.url,
            lead_count: parseInt(row.lead_count),
            conversions: parseInt(row.conversions),
            conversion_rate: `${parseFloat(row.conversion_rate).toFixed(2)}%`,
          })),
        },

        // Campaign metrikleri
        campaigns: {
          total: parseInt(campaignsStats.total_campaigns),
          active: parseInt(campaignsStats.active_campaigns),
          total_leads: parseInt(campaignsStats.total_leads_from_campaigns),
          conversions: parseInt(campaignsStats.converted_from_campaigns),
          total_budget: parseFloat(campaignsStats.total_budget),
          total_spent: parseFloat(campaignsStats.total_spent),
          budget_utilization: campaignsStats.total_budget > 0
            ? `${((parseFloat(campaignsStats.total_spent) / parseFloat(campaignsStats.total_budget)) * 100).toFixed(2)}%`
            : '0.00%',
          top_performers: topCampaignsResult.rows.map(row => ({
            id: row.id,
            name: row.name,
            type: row.campaign_type,
            status: row.status,
            lead_count: parseInt(row.lead_count),
            conversions: parseInt(row.conversions),
            conversion_rate: `${parseFloat(row.conversion_rate).toFixed(2)}%`,
            budget: parseFloat(row.budget),
            spent: parseFloat(row.spent),
            cost_per_lead: parseFloat(row.cost_per_lead).toFixed(2),
          })),
        },

        // Trend analizi (son 30 gün)
        trends: {
          daily: dailyTrendsResult.rows.map(row => ({
            date: row.date,
            leads: parseInt(row.leads),
            conversions: parseInt(row.conversions),
          })),
        },

        // Lead kaynakları dağılımı
        lead_sources: leadSourcesResult.rows.map(row => ({
          source: row.source_type,
          count: parseInt(row.count),
          conversions: parseInt(row.conversions),
          conversion_rate: row.count > 0 
            ? `${((parseInt(row.conversions) / parseInt(row.count)) * 100).toFixed(2)}%`
            : '0.00%',
        })),

        // Son aktiviteler
        recent_activities: recentActivitiesResult.rows.map(row => ({
          id: row.id,
          lead_id: row.lead_id,
          lead_name: row.lead_name,
          lead_status: row.lead_status,
          activity_type: row.activity_type,
          description: row.description,
          created_at: row.created_at,
        })),

        // Genel özet
        summary: {
          total_revenue_sources: parseInt(networksStats.total_networks) + parseInt(sitesStats.total_sites) + parseInt(campaignsStats.active_campaigns),
          total_leads: parseInt(leadsStats.total_leads),
          total_conversions: parseInt(leadsStats.converted_leads),
          overall_conversion_rate: conversionRate + '%',
          total_investment: parseFloat(networksStats.total_cost) + parseFloat(campaignsStats.total_spent),
        },
      },
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error: any) {
    console.error('Dashboard analytics error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard analytics' },
      { status: 500 }
    );
  }
}
