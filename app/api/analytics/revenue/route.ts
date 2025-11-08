import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import db from '@/lib/db';

/**
 * GET /api/analytics/revenue
 * 
 * Gelir & Maliyet Analizi:
 * - Revenue tracking (conversion-based)
 * - Cost analysis (networks + campaigns)
 * - Profit/Loss calculations
 * - Break-even analysis
 * - Revenue per source (network/site/campaign)
 * - Monthly/Quarterly revenue trends
 * - Profitability ratios
 * 
 * Query Parameters:
 * - date_range: today, week, month, quarter, year, custom
 * - start_date: YYYY-MM-DD (for custom range)
 * - end_date: YYYY-MM-DD (for custom range)
 * - group_by: day, week, month (trend grouping)
 * - avg_conversion_value: (optional) Average revenue per conversion (default: 500)
 * - include_projections: true/false (future revenue projections)
 */

const querySchema = z.object({
  date_range: z.enum(['today', 'week', 'month', 'quarter', 'year', 'custom']).optional().default('month'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  group_by: z.enum(['day', 'week', 'month']).optional().default('month'),
  avg_conversion_value: z.string().optional().default('500'),
  include_projections: z.enum(['true', 'false']).optional().default('false'),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = querySchema.parse({
      date_range: searchParams.get('date_range') || 'month',
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      group_by: searchParams.get('group_by') || 'month',
      avg_conversion_value: searchParams.get('avg_conversion_value') || '500',
      include_projections: searchParams.get('include_projections') || 'false',
    });

    const avgConversionValue = parseFloat(query.avg_conversion_value);

    // Date range hesaplama
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
      case 'quarter':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 3);
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

    // 1. Genel Revenue & Cost Overview
    const overviewResult = await db.query(
      `SELECT 
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as total_conversions,
        COUNT(l.id) as total_leads,
        COALESCE(SUM(CASE 
          WHEN l.network_id IS NOT NULL THEN n.cost_per_lead
          ELSE 0
        END), 0) as network_costs,
        COALESCE(SUM(c.spent), 0) as campaign_costs
      FROM leads l
      LEFT JOIN networks n ON n.id = l.network_id
      LEFT JOIN campaigns c ON c.id = l.campaign_id
      WHERE l.created_at >= $1 AND l.created_at <= $2`,
      [startDate, endDate]
    );

    const overview = overviewResult.rows[0];
    const totalConversions = parseInt(overview.total_conversions);
    const totalLeads = parseInt(overview.total_leads);
    const networkCosts = parseFloat(overview.network_costs);
    const campaignCosts = parseFloat(overview.campaign_costs);
    
    const totalRevenue = totalConversions * avgConversionValue;
    const totalCosts = networkCosts + campaignCosts;
    const grossProfit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(2) : '0.00';
    const roi = totalCosts > 0 ? (((totalRevenue - totalCosts) / totalCosts) * 100).toFixed(2) : '0.00';

    // 2. Revenue by Source (Network, Site, Campaign, Direct)
    const revenueBySourceResult = await db.query(
      `SELECT 
        CASE 
          WHEN l.network_id IS NOT NULL THEN 'network'
          WHEN l.site_id IS NOT NULL THEN 'site'
          WHEN l.campaign_id IS NOT NULL THEN 'campaign'
          ELSE 'direct'
        END as source,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as conversions,
        COUNT(l.id) as leads,
        COALESCE(SUM(CASE 
          WHEN l.network_id IS NOT NULL THEN n.cost_per_lead
          WHEN l.campaign_id IS NOT NULL THEN c.spent / NULLIF(COUNT(*) OVER (PARTITION BY l.campaign_id), 0)
          ELSE 0
        END), 0) as costs
      FROM leads l
      LEFT JOIN networks n ON n.id = l.network_id
      LEFT JOIN campaigns c ON c.id = l.campaign_id
      WHERE l.created_at >= $1 AND l.created_at <= $2
      GROUP BY source
      ORDER BY conversions DESC`,
      [startDate, endDate]
    );

    const revenueBySource = revenueBySourceResult.rows.map(row => {
      const conversions = parseInt(row.conversions);
      const revenue = conversions * avgConversionValue;
      const costs = parseFloat(row.costs);
      const profit = revenue - costs;
      
      return {
        source: row.source,
        leads: parseInt(row.leads),
        conversions: conversions,
        revenue: revenue.toFixed(2),
        costs: costs.toFixed(2),
        profit: profit.toFixed(2),
        roi: costs > 0 ? (((revenue - costs) / costs) * 100).toFixed(2) + '%' : 'N/A',
        profit_margin: revenue > 0 ? ((profit / revenue) * 100).toFixed(2) + '%' : '0.00%',
      };
    });

    // 3. Top Revenue Generating Networks
    const topNetworksResult = await db.query(
      `SELECT 
        n.id,
        n.name,
        n.cost_per_lead,
        COUNT(l.id) as leads,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as conversions,
        n.cost_per_lead * COUNT(l.id) as costs
      FROM networks n
      JOIN leads l ON l.network_id = n.id
      WHERE l.created_at >= $1 AND l.created_at <= $2
      GROUP BY n.id, n.name, n.cost_per_lead
      HAVING COUNT(CASE WHEN l.status = 'converted' THEN 1 END) > 0
      ORDER BY conversions DESC
      LIMIT 10`,
      [startDate, endDate]
    );

    const topNetworks = topNetworksResult.rows.map(row => {
      const conversions = parseInt(row.conversions);
      const revenue = conversions * avgConversionValue;
      const costs = parseFloat(row.costs);
      const profit = revenue - costs;
      
      return {
        id: row.id,
        name: row.name,
        leads: parseInt(row.leads),
        conversions: conversions,
        revenue: revenue.toFixed(2),
        costs: costs.toFixed(2),
        profit: profit.toFixed(2),
        roi: costs > 0 ? (((revenue - costs) / costs) * 100).toFixed(2) + '%' : 'N/A',
      };
    });

    // 4. Top Revenue Generating Campaigns
    const topCampaignsResult = await db.query(
      `SELECT 
        c.id,
        c.name,
        c.campaign_type,
        c.spent,
        COUNT(l.id) as leads,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as conversions
      FROM campaigns c
      LEFT JOIN leads l ON l.campaign_id = c.id 
        AND l.created_at >= $1 AND l.created_at <= $2
      GROUP BY c.id, c.name, c.campaign_type, c.spent
      HAVING COUNT(CASE WHEN l.status = 'converted' THEN 1 END) > 0
      ORDER BY conversions DESC
      LIMIT 10`,
      [startDate, endDate]
    );

    const topCampaigns = topCampaignsResult.rows.map(row => {
      const conversions = parseInt(row.conversions);
      const revenue = conversions * avgConversionValue;
      const costs = parseFloat(row.spent || 0);
      const profit = revenue - costs;
      
      return {
        id: row.id,
        name: row.name,
        type: row.campaign_type,
        leads: parseInt(row.leads),
        conversions: conversions,
        revenue: revenue.toFixed(2),
        costs: costs.toFixed(2),
        profit: profit.toFixed(2),
        roi: costs > 0 ? (((revenue - costs) / costs) * 100).toFixed(2) + '%' : 'N/A',
      };
    });

    // 5. Zaman Bazlı Revenue Trend
    let dateGroupFormat: string;
    switch (query.group_by) {
      case 'day':
        dateGroupFormat = 'DATE(l.created_at)';
        break;
      case 'week':
        dateGroupFormat = "DATE_TRUNC('week', l.created_at)";
        break;
      case 'month':
        dateGroupFormat = "DATE_TRUNC('month', l.created_at)";
        break;
      default:
        dateGroupFormat = 'DATE(l.created_at)';
    }

    const trendsResult = await db.query(
      `SELECT 
        ${dateGroupFormat} as period,
        COUNT(l.id) as leads,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as conversions,
        COALESCE(SUM(CASE 
          WHEN l.network_id IS NOT NULL THEN n.cost_per_lead
          ELSE 0
        END), 0) as network_costs,
        COALESCE(SUM(c.spent), 0) as campaign_costs
      FROM leads l
      LEFT JOIN networks n ON n.id = l.network_id
      LEFT JOIN campaigns c ON c.id = l.campaign_id
      WHERE l.created_at >= $1 AND l.created_at <= $2
      GROUP BY period
      ORDER BY period ASC`,
      [startDate, endDate]
    );

    const trends = trendsResult.rows.map(row => {
      const conversions = parseInt(row.conversions);
      const revenue = conversions * avgConversionValue;
      const costs = parseFloat(row.network_costs) + parseFloat(row.campaign_costs);
      const profit = revenue - costs;
      
      return {
        period: row.period,
        leads: parseInt(row.leads),
        conversions: conversions,
        revenue: revenue.toFixed(2),
        costs: costs.toFixed(2),
        profit: profit.toFixed(2),
        profit_margin: revenue > 0 ? ((profit / revenue) * 100).toFixed(2) + '%' : '0.00%',
      };
    });

    // 6. Break-even Analysis
    const breakEvenConversions = totalCosts > 0 ? Math.ceil(totalCosts / avgConversionValue) : 0;
    const conversionsToBreakEven = Math.max(0, breakEvenConversions - totalConversions);
    const isBreakEvenReached = totalConversions >= breakEvenConversions;
    
    const avgLeadsPerConversion = totalConversions > 0 ? (totalLeads / totalConversions).toFixed(2) : '0';
    const leadsNeededToBreakEven = isBreakEvenReached ? 0 : Math.ceil(conversionsToBreakEven * parseFloat(avgLeadsPerConversion));

    // 7. Cost Breakdown
    const costBreakdown = {
      network_costs: {
        amount: networkCosts.toFixed(2),
        percentage: totalCosts > 0 ? ((networkCosts / totalCosts) * 100).toFixed(2) + '%' : '0.00%',
      },
      campaign_costs: {
        amount: campaignCosts.toFixed(2),
        percentage: totalCosts > 0 ? ((campaignCosts / totalCosts) * 100).toFixed(2) + '%' : '0.00%',
      },
      total: totalCosts.toFixed(2),
    };

    // 8. Profitability Metrics
    const profitabilityMetrics = {
      gross_profit: grossProfit.toFixed(2),
      profit_margin: `${profitMargin}%`,
      roi: `${roi}%`,
      revenue_per_lead: totalLeads > 0 ? (totalRevenue / totalLeads).toFixed(2) : '0.00',
      cost_per_lead: totalLeads > 0 ? (totalCosts / totalLeads).toFixed(2) : '0.00',
      profit_per_lead: totalLeads > 0 ? (grossProfit / totalLeads).toFixed(2) : '0.00',
      cost_per_conversion: totalConversions > 0 ? (totalCosts / totalConversions).toFixed(2) : '0.00',
      conversion_value: avgConversionValue.toFixed(2),
    };

    // 9. Future Projections (if enabled)
    let projections = null;
    if (query.include_projections === 'true' && totalLeads > 0) {
      const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const dailyLeadRate = totalLeads / periodDays;
      const dailyConversionRate = totalConversions / periodDays;
      const dailyCostRate = totalCosts / periodDays;
      
      // Project next 30 days
      const projectedLeads = Math.ceil(dailyLeadRate * 30);
      const projectedConversions = Math.ceil(dailyConversionRate * 30);
      const projectedRevenue = projectedConversions * avgConversionValue;
      const projectedCosts = dailyCostRate * 30;
      const projectedProfit = projectedRevenue - projectedCosts;
      
      projections = {
        period: '30 days',
        projected_leads: projectedLeads,
        projected_conversions: projectedConversions,
        projected_revenue: projectedRevenue.toFixed(2),
        projected_costs: projectedCosts.toFixed(2),
        projected_profit: projectedProfit.toFixed(2),
        projected_roi: projectedCosts > 0 ? (((projectedRevenue - projectedCosts) / projectedCosts) * 100).toFixed(2) + '%' : 'N/A',
      };
    }

    // 10. Insights ve Öneriler
    const insights = generateRevenueInsights(
      totalRevenue,
      totalCosts,
      grossProfit,
      parseFloat(profitMargin),
      isBreakEvenReached,
      revenueBySource
    );

    // Response hazırla
    const response = {
      success: true,
      data: {
        period: {
          date_range: query.date_range,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          group_by: query.group_by,
        },
        settings: {
          avg_conversion_value: avgConversionValue.toFixed(2),
        },

        overview: {
          total_leads: totalLeads,
          total_conversions: totalConversions,
          total_revenue: totalRevenue.toFixed(2),
          total_costs: totalCosts.toFixed(2),
          gross_profit: grossProfit.toFixed(2),
          profit_margin: `${profitMargin}%`,
          roi: `${roi}%`,
        },

        cost_breakdown: costBreakdown,

        profitability_metrics: profitabilityMetrics,

        revenue_by_source: revenueBySource,

        top_performers: {
          networks: topNetworks,
          campaigns: topCampaigns,
        },

        trends: trends,

        break_even_analysis: {
          break_even_conversions: breakEvenConversions,
          conversions_to_break_even: conversionsToBreakEven,
          is_break_even_reached: isBreakEvenReached,
          leads_needed_to_break_even: leadsNeededToBreakEven,
          break_even_status: isBreakEvenReached ? 'Profitable' : 'Not yet break-even',
        },

        projections: projections,

        insights: insights,
      },
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error: any) {
    console.error('Revenue analytics error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch revenue analytics' },
      { status: 500 }
    );
  }
}

/**
 * Revenue insights ve öneriler oluştur
 */
function generateRevenueInsights(
  totalRevenue: number,
  totalCosts: number,
  grossProfit: number,
  profitMargin: number,
  isBreakEvenReached: boolean,
  revenueBySource: any[]
): string[] {
  const insights: string[] = [];
  
  // Break-even status
  if (!isBreakEvenReached) {
    insights.push('⚠️ Henüz break-even noktasına ulaşılmadı. Maliyetleri düşürme veya conversion artırma stratejileri gerekli.');
  } else if (profitMargin > 30) {
    insights.push('🎉 Harika karlılık! Profit margin %30\'un üzerinde.');
  } else if (profitMargin > 15) {
    insights.push('✅ İyi karlılık seviyesi. Profit margin sağlıklı.');
  } else if (profitMargin > 0) {
    insights.push('💡 Karlı ama profit margin düşük. Maliyet optimizasyonu yapılabilir.');
  }
  
  // ROI insights
  const roi = totalCosts > 0 ? ((totalRevenue - totalCosts) / totalCosts) * 100 : 0;
  if (roi > 100) {
    insights.push('🚀 Mükemmel ROI! Her harcanan TL için ' + ((roi / 100) + 1).toFixed(2) + ' TL kazanç.');
  } else if (roi > 50) {
    insights.push('💰 İyi ROI. Yatırım geri dönüşü sağlıklı.');
  } else if (roi > 0) {
    insights.push('📊 Pozitif ROI ama iyileştirme potansiyeli var.');
  }
  
  // Source analysis
  if (revenueBySource.length > 0) {
    const bestSource = revenueBySource.reduce((best, current) => 
      parseFloat(current.profit) > parseFloat(best.profit) ? current : best
    );
    insights.push(`💎 En karlı kaynak: ${bestSource.source} (${bestSource.profit} TL kar)`);
    
    const worstSource = revenueBySource.find(s => parseFloat(s.profit) < 0);
    if (worstSource) {
      insights.push(`🚨 ${worstSource.source} kaynağı zarar ediyor. İnceleme gerekli.`);
    }
  }
  
  // Cost efficiency
  if (totalCosts > totalRevenue * 0.7) {
    insights.push('⚠️ Maliyetler yüksek. Gelirin %70\'inden fazlası maliyetlere gidiyor.');
  }
  
  return insights;
}
