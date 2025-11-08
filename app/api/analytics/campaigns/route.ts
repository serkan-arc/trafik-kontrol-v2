import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import db from '@/lib/db';

/**
 * GET /api/analytics/campaigns
 * 
 * Kampanya ROI analizi ve performans izleme:
 * - ROI hesaplamaları (Return on Investment)
 * - Budget tracking ve utilization
 * - Cost per lead/conversion metrikleri
 * - Target achievement analysis
 * - Campaign type comparison (PPC, Social, Email, etc.)
 * - Time-based performance trends
 * - UTM tracking insights
 * 
 * Query Parameters:
 * - date_range: today, week, month, year, custom
 * - start_date: YYYY-MM-DD (for custom range)
 * - end_date: YYYY-MM-DD (for custom range)
 * - campaign_type: ppc, social, email, seo, affiliate, direct, other, all
 * - status: draft, active, paused, completed, cancelled, all
 * - sort_by: roi, leads, conversions, budget_utilization, cost_efficiency
 * - order: asc, desc
 * - min_budget: (optional) Minimum budget filter
 */

const querySchema = z.object({
  date_range: z.enum(['today', 'week', 'month', 'year', 'custom']).optional().default('month'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  campaign_type: z.enum(['ppc', 'social', 'email', 'seo', 'affiliate', 'direct', 'other', 'all']).optional().default('all'),
  status: z.enum(['draft', 'active', 'paused', 'completed', 'cancelled', 'all']).optional().default('all'),
  sort_by: z.enum(['roi', 'leads', 'conversions', 'budget_utilization', 'cost_efficiency']).optional().default('roi'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  min_budget: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = querySchema.parse({
      date_range: searchParams.get('date_range') || 'month',
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      campaign_type: searchParams.get('campaign_type') || 'all',
      status: searchParams.get('status') || 'all',
      sort_by: searchParams.get('sort_by') || 'roi',
      order: searchParams.get('order') || 'desc',
      min_budget: searchParams.get('min_budget') || undefined,
    });

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

    // Filters
    const typeFilter = query.campaign_type !== 'all' ? `AND c.campaign_type = '${query.campaign_type}'` : '';
    const statusFilter = query.status !== 'all' ? `AND c.status = '${query.status}'` : '';
    const minBudgetFilter = query.min_budget ? `AND c.budget >= ${parseFloat(query.min_budget)}` : '';

    // 1. Genel Campaign İstatistikleri
    const overviewResult = await db.query(
      `SELECT 
        COUNT(DISTINCT c.id) as total_campaigns,
        COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) as active_campaigns,
        COUNT(DISTINCT CASE WHEN c.status = 'completed' THEN c.id END) as completed_campaigns,
        COALESCE(SUM(c.budget), 0) as total_budget,
        COALESCE(SUM(c.spent), 0) as total_spent,
        COUNT(l.id) as total_leads,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as total_conversions
      FROM campaigns c
      LEFT JOIN leads l ON l.campaign_id = c.id 
        AND l.created_at >= $1 AND l.created_at <= $2
      WHERE 1=1 ${typeFilter} ${statusFilter} ${minBudgetFilter}`,
      [startDate, endDate]
    );

    const overview = overviewResult.rows[0];
    const totalBudget = parseFloat(overview.total_budget);
    const totalSpent = parseFloat(overview.total_spent);
    const totalLeads = parseInt(overview.total_leads);
    const totalConversions = parseInt(overview.total_conversions);
    
    const budgetUtilization = totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(2) : '0.00';
    const avgCostPerLead = totalLeads > 0 ? (totalSpent / totalLeads).toFixed(2) : '0.00';
    const avgCostPerConversion = totalConversions > 0 ? (totalSpent / totalConversions).toFixed(2) : '0.00';
    const overallConversionRate = totalLeads > 0 ? ((totalConversions / totalLeads) * 100).toFixed(2) : '0.00';

    // 2. Detaylı Campaign Performans Listesi
    let orderByClause: string;
    switch (query.sort_by) {
      case 'roi':
        orderByClause = 'roi_value';
        break;
      case 'leads':
        orderByClause = 'lead_count';
        break;
      case 'conversions':
        orderByClause = 'conversions';
        break;
      case 'budget_utilization':
        orderByClause = 'budget_used_percentage';
        break;
      case 'cost_efficiency':
        orderByClause = 'cost_per_conversion';
        break;
      default:
        orderByClause = 'roi_value';
    }

    const campaignsResult = await db.query(
      `SELECT 
        c.id,
        c.name,
        c.campaign_type,
        c.status,
        c.budget,
        c.spent,
        c.target_leads,
        c.target_conversions,
        c.utm_source,
        c.utm_medium,
        c.utm_campaign,
        c.start_date,
        c.end_date,
        c.created_at,
        COUNT(l.id) as lead_count,
        COUNT(CASE WHEN l.status = 'new' THEN 1 END) as new_leads,
        COUNT(CASE WHEN l.status = 'contacted' THEN 1 END) as contacted_leads,
        COUNT(CASE WHEN l.status = 'qualified' THEN 1 END) as qualified_leads,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as conversions,
        COUNT(CASE WHEN l.status = 'rejected' THEN 1 END) as rejected_leads,
        CASE 
          WHEN COUNT(l.id) > 0 THEN (COUNT(CASE WHEN l.status = 'converted' THEN 1 END)::float / COUNT(l.id) * 100)
          ELSE 0 
        END as conversion_rate,
        CASE 
          WHEN COUNT(l.id) > 0 THEN c.spent / COUNT(l.id)
          ELSE 0 
        END as cost_per_lead,
        CASE 
          WHEN COUNT(CASE WHEN l.status = 'converted' THEN 1 END) > 0 
          THEN c.spent / COUNT(CASE WHEN l.status = 'converted' THEN 1 END)
          ELSE 0 
        END as cost_per_conversion,
        CASE 
          WHEN c.budget > 0 THEN (c.spent / c.budget * 100)
          ELSE 0 
        END as budget_used_percentage,
        CASE 
          WHEN c.spent > 0 
          THEN ((COUNT(CASE WHEN l.status = 'converted' THEN 1 END) * 500 - c.spent) / c.spent * 100)
          ELSE 0 
        END as roi_value,
        AVG(CASE 
          WHEN l.status = 'converted' AND l.converted_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (l.converted_at - l.created_at))/86400 
        END) as avg_days_to_convert
      FROM campaigns c
      LEFT JOIN leads l ON l.campaign_id = c.id 
        AND l.created_at >= $1 AND l.created_at <= $2
      WHERE 1=1 ${typeFilter} ${statusFilter} ${minBudgetFilter}
      GROUP BY c.id, c.name, c.campaign_type, c.status, c.budget, c.spent, 
               c.target_leads, c.target_conversions, c.utm_source, c.utm_medium, 
               c.utm_campaign, c.start_date, c.end_date, c.created_at
      ORDER BY ${orderByClause} ${query.order.toUpperCase()}`,
      [startDate, endDate]
    );

    const campaigns = campaignsResult.rows.map(row => {
      const leadCount = parseInt(row.lead_count);
      const conversions = parseInt(row.conversions);
      const budget = parseFloat(row.budget || 0);
      const spent = parseFloat(row.spent || 0);
      const targetLeads = row.target_leads ? parseInt(row.target_leads) : null;
      const targetConversions = row.target_conversions ? parseInt(row.target_conversions) : null;
      
      // Target achievement calculations
      const leadTargetAchievement = targetLeads && targetLeads > 0
        ? ((leadCount / targetLeads) * 100).toFixed(2)
        : null;
      const conversionTargetAchievement = targetConversions && targetConversions > 0
        ? ((conversions / targetConversions) * 100).toFixed(2)
        : null;

      // Days running/remaining
      const now = new Date();
      const daysRunning = row.start_date 
        ? Math.floor((now.getTime() - new Date(row.start_date).getTime()) / (1000 * 60 * 60 * 24))
        : null;
      const daysRemaining = row.end_date && new Date(row.end_date) > now
        ? Math.floor((new Date(row.end_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        id: row.id,
        name: row.name,
        type: row.campaign_type,
        status: row.status,
        
        budget_tracking: {
          budget: budget.toFixed(2),
          spent: spent.toFixed(2),
          remaining: (budget - spent).toFixed(2),
          utilization: `${parseFloat(row.budget_used_percentage).toFixed(2)}%`,
          is_over_budget: spent > budget,
        },

        performance: {
          lead_count: leadCount,
          conversions: conversions,
          conversion_rate: `${parseFloat(row.conversion_rate).toFixed(2)}%`,
          status_breakdown: {
            new: parseInt(row.new_leads),
            contacted: parseInt(row.contacted_leads),
            qualified: parseInt(row.qualified_leads),
            converted: conversions,
            rejected: parseInt(row.rejected_leads),
          },
        },

        cost_metrics: {
          cost_per_lead: parseFloat(row.cost_per_lead).toFixed(2),
          cost_per_conversion: conversions > 0 ? parseFloat(row.cost_per_conversion).toFixed(2) : 'N/A',
          roi: `${parseFloat(row.roi_value).toFixed(2)}%`,
          avg_days_to_convert: parseFloat(row.avg_days_to_convert || 0).toFixed(2),
        },

        targets: {
          lead_target: targetLeads,
          lead_achievement: leadTargetAchievement ? `${leadTargetAchievement}%` : null,
          conversion_target: targetConversions,
          conversion_achievement: conversionTargetAchievement ? `${conversionTargetAchievement}%` : null,
          on_track: leadTargetAchievement && parseFloat(leadTargetAchievement) >= 80,
        },

        utm_tracking: {
          utm_source: row.utm_source,
          utm_medium: row.utm_medium,
          utm_campaign: row.utm_campaign,
        },

        timeline: {
          start_date: row.start_date,
          end_date: row.end_date,
          days_running: daysRunning,
          days_remaining: daysRemaining,
          created_at: row.created_at,
        },
      };
    });

    // 3. Campaign Type Comparison
    const typeComparisonResult = await db.query(
      `SELECT 
        c.campaign_type,
        COUNT(DISTINCT c.id) as campaign_count,
        COALESCE(SUM(c.budget), 0) as total_budget,
        COALESCE(SUM(c.spent), 0) as total_spent,
        COUNT(l.id) as total_leads,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as total_conversions,
        CASE 
          WHEN COUNT(l.id) > 0 THEN (COUNT(CASE WHEN l.status = 'converted' THEN 1 END)::float / COUNT(l.id) * 100)
          ELSE 0 
        END as conversion_rate,
        CASE 
          WHEN COUNT(l.id) > 0 THEN SUM(c.spent) / COUNT(l.id)
          ELSE 0 
        END as avg_cost_per_lead
      FROM campaigns c
      LEFT JOIN leads l ON l.campaign_id = c.id 
        AND l.created_at >= $1 AND l.created_at <= $2
      GROUP BY c.campaign_type
      ORDER BY total_leads DESC`,
      [startDate, endDate]
    );

    const typeComparison = typeComparisonResult.rows.map(row => ({
      type: row.campaign_type,
      campaign_count: parseInt(row.campaign_count),
      total_budget: parseFloat(row.total_budget).toFixed(2),
      total_spent: parseFloat(row.total_spent).toFixed(2),
      total_leads: parseInt(row.total_leads),
      total_conversions: parseInt(row.total_conversions),
      conversion_rate: `${parseFloat(row.conversion_rate).toFixed(2)}%`,
      avg_cost_per_lead: parseFloat(row.avg_cost_per_lead).toFixed(2),
    }));

    // 4. Zaman Bazlı Trend (Son 30 gün)
    const trendsResult = await db.query(
      `SELECT 
        c.id as campaign_id,
        c.name as campaign_name,
        DATE(l.created_at) as date,
        COUNT(l.id) as daily_leads,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as daily_conversions
      FROM campaigns c
      LEFT JOIN leads l ON l.campaign_id = c.id 
        AND l.created_at >= NOW() - INTERVAL '30 days'
      WHERE c.status IN ('active', 'completed')
      GROUP BY c.id, c.name, DATE(l.created_at)
      ORDER BY c.name, date DESC`,
      []
    );

    const trendsByCampaign: Record<number, any[]> = {};
    trendsResult.rows.forEach(row => {
      if (!trendsByCampaign[row.campaign_id]) {
        trendsByCampaign[row.campaign_id] = [];
      }
      if (row.date) {
        trendsByCampaign[row.campaign_id].push({
          date: row.date,
          leads: parseInt(row.daily_leads),
          conversions: parseInt(row.daily_conversions),
        });
      }
    });

    // 5. Best & Worst Performers
    const bestByROI = campaigns
      .filter(c => parseFloat(c.cost_metrics.roi) > 0)
      .sort((a, b) => parseFloat(b.cost_metrics.roi) - parseFloat(a.cost_metrics.roi))
      .slice(0, 5);

    const bestByCostEfficiency = campaigns
      .filter(c => c.cost_metrics.cost_per_conversion !== 'N/A')
      .sort((a, b) => parseFloat(a.cost_metrics.cost_per_conversion) - parseFloat(b.cost_metrics.cost_per_conversion))
      .slice(0, 5);

    const worstByBudgetOverrun = campaigns
      .filter(c => c.budget_tracking.is_over_budget)
      .sort((a, b) => parseFloat(b.budget_tracking.spent) - parseFloat(a.budget_tracking.spent))
      .slice(0, 5);

    const underperforming = campaigns
      .filter(c => c.targets.on_track === false && c.status === 'active')
      .slice(0, 5);

    // 6. UTM Source Analysis
    const utmAnalysisResult = await db.query(
      `SELECT 
        c.utm_source,
        COUNT(DISTINCT c.id) as campaign_count,
        COUNT(l.id) as total_leads,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as conversions,
        SUM(c.spent) as total_spent
      FROM campaigns c
      LEFT JOIN leads l ON l.campaign_id = c.id 
        AND l.created_at >= $1 AND l.created_at <= $2
      WHERE c.utm_source IS NOT NULL
      GROUP BY c.utm_source
      ORDER BY total_leads DESC`,
      [startDate, endDate]
    );

    const utmAnalysis = utmAnalysisResult.rows.map(row => ({
      utm_source: row.utm_source,
      campaign_count: parseInt(row.campaign_count),
      total_leads: parseInt(row.total_leads),
      conversions: parseInt(row.conversions),
      conversion_rate: row.total_leads > 0
        ? `${((parseInt(row.conversions) / parseInt(row.total_leads)) * 100).toFixed(2)}%`
        : '0.00%',
      total_spent: parseFloat(row.total_spent || 0).toFixed(2),
    }));

    // 7. Insights ve Öneriler
    const insights = generateCampaignInsights(
      campaigns,
      totalBudget,
      totalSpent,
      totalConversions,
      typeComparison
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
        filters: {
          campaign_type: query.campaign_type,
          status: query.status,
          sort_by: query.sort_by,
          order: query.order,
        },

        overview: {
          total_campaigns: parseInt(overview.total_campaigns),
          active_campaigns: parseInt(overview.active_campaigns),
          completed_campaigns: parseInt(overview.completed_campaigns),
          budget_summary: {
            total_budget: totalBudget.toFixed(2),
            total_spent: totalSpent.toFixed(2),
            remaining_budget: (totalBudget - totalSpent).toFixed(2),
            utilization: `${budgetUtilization}%`,
          },
          performance_summary: {
            total_leads: totalLeads,
            total_conversions: totalConversions,
            overall_conversion_rate: `${overallConversionRate}%`,
            avg_cost_per_lead: avgCostPerLead,
            avg_cost_per_conversion: avgCostPerConversion,
          },
        },

        campaigns: campaigns,

        type_comparison: typeComparison,

        trends_by_campaign: trendsByCampaign,

        rankings: {
          best_by_roi: bestByROI.map(c => ({
            id: c.id,
            name: c.name,
            roi: c.cost_metrics.roi,
            conversions: c.performance.conversions,
          })),
          best_by_cost_efficiency: bestByCostEfficiency.map(c => ({
            id: c.id,
            name: c.name,
            cost_per_conversion: c.cost_metrics.cost_per_conversion,
            conversions: c.performance.conversions,
          })),
          budget_overruns: worstByBudgetOverrun.map(c => ({
            id: c.id,
            name: c.name,
            budget: c.budget_tracking.budget,
            spent: c.budget_tracking.spent,
            overrun: (parseFloat(c.budget_tracking.spent) - parseFloat(c.budget_tracking.budget)).toFixed(2),
          })),
          underperforming: underperforming.map(c => ({
            id: c.id,
            name: c.name,
            lead_achievement: c.targets.lead_achievement,
            conversion_achievement: c.targets.conversion_achievement,
          })),
        },

        utm_analysis: utmAnalysis,

        insights: insights,
      },
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error: any) {
    console.error('Campaign analytics error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch campaign analytics' },
      { status: 500 }
    );
  }
}

/**
 * Campaign insights ve öneriler oluştur
 */
function generateCampaignInsights(
  campaigns: any[],
  totalBudget: number,
  totalSpent: number,
  totalConversions: number,
  typeComparison: any[]
): string[] {
  const insights: string[] = [];
  
  // Budget management
  const budgetUtil = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  if (budgetUtil > 90) {
    insights.push('⚠️ Budget kullanımı %90\'ı geçti. Bütçe artırımı veya kampanya optimizasyonu gerekebilir.');
  } else if (budgetUtil < 50 && campaigns.some(c => c.status === 'active')) {
    insights.push('💡 Aktif kampanyalar var ama bütçe kullanımı düşük. Harcamayı artırabilirsiniz.');
  }
  
  // Top performer
  if (campaigns.length > 0) {
    const best = campaigns[0];
    insights.push(`🏆 En iyi kampanya: ${best.name} (${best.cost_metrics.roi} ROI)`);
  }
  
  // Conversion efficiency
  const avgConvRate = campaigns.length > 0
    ? campaigns.reduce((sum, c) => sum + parseFloat(c.performance.conversion_rate), 0) / campaigns.length
    : 0;
  if (avgConvRate < 5) {
    insights.push('🚨 Genel conversion oranı düşük. Landing page ve takip süreçlerini optimize edin.');
  }
  
  // Campaign type insights
  if (typeComparison.length > 0) {
    const bestType = typeComparison.reduce((best, current) => 
      parseFloat(current.conversion_rate) > parseFloat(best.conversion_rate) ? current : best
    );
    insights.push(`📊 En etkili kampanya tipi: ${bestType.type} (${bestType.conversion_rate} conversion rate)`);
  }
  
  // Underperforming campaigns
  const underperforming = campaigns.filter(c => c.targets.on_track === false && c.status === 'active');
  if (underperforming.length > 0) {
    insights.push(`⚠️ ${underperforming.length} kampanya hedefin altında performans gösteriyor.`);
  }
  
  return insights;
}
