import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import db from '@/lib/db';

/**
 * GET /api/analytics/leads
 * 
 * Detaylı lead analizleri ve insights:
 * - Status dağılımı ve geçiş metrikleri
 * - Kaynak analizi (network/site/campaign)
 * - Zaman bazlı trendler (günlük/haftalık/aylık)
 * - Conversion funnel metrikleri
 * - Lead quality scoring
 * - Geographic distribution
 * - Response time analytics
 * 
 * Query Parameters:
 * - date_range: today, week, month, year, custom
 * - start_date: YYYY-MM-DD (for custom range)
 * - end_date: YYYY-MM-DD (for custom range)
 * - group_by: day, week, month (trend grouping)
 * - source_type: network, site, campaign, direct (filter by source)
 * - status: new, contacted, qualified, converted, rejected (filter by status)
 */

const querySchema = z.object({
  date_range: z.enum(['today', 'week', 'month', 'year', 'custom']).optional().default('month'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  group_by: z.enum(['day', 'week', 'month']).optional().default('day'),
  source_type: z.enum(['network', 'site', 'campaign', 'direct', 'all']).optional().default('all'),
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'rejected', 'all']).optional().default('all'),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = querySchema.parse({
      date_range: searchParams.get('date_range') || 'month',
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      group_by: searchParams.get('group_by') || 'day',
      source_type: searchParams.get('source_type') || 'all',
      status: searchParams.get('status') || 'all',
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

    // Source type filter
    let sourceFilter = '';
    if (query.source_type !== 'all') {
      switch (query.source_type) {
        case 'network':
          sourceFilter = 'AND network_id IS NOT NULL';
          break;
        case 'site':
          sourceFilter = 'AND site_id IS NOT NULL';
          break;
        case 'campaign':
          sourceFilter = 'AND campaign_id IS NOT NULL';
          break;
        case 'direct':
          sourceFilter = 'AND network_id IS NULL AND site_id IS NULL AND campaign_id IS NULL';
          break;
      }
    }

    // Status filter
    const statusFilter = query.status !== 'all' ? `AND status = '${query.status}'` : '';

    // 1. Genel Lead Metrikleri
    const overviewResult = await db.query(
      `SELECT 
        COUNT(*) as total_leads,
        COUNT(CASE WHEN status = 'new' THEN 1 END) as new_count,
        COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contacted_count,
        COUNT(CASE WHEN status = 'qualified' THEN 1 END) as qualified_count,
        COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted_count,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
        AVG(CASE 
          WHEN status = 'converted' AND converted_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (converted_at - created_at))/86400 
        END) as avg_days_to_convert,
        AVG(call_count) as avg_calls_per_lead,
        COUNT(CASE WHEN last_contact_at IS NOT NULL THEN 1 END) as contacted_leads,
        AVG(CASE 
          WHEN last_contact_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (last_contact_at - created_at))/3600 
        END) as avg_first_response_hours
      FROM leads 
      WHERE created_at >= $1 AND created_at <= $2 ${sourceFilter} ${statusFilter}`,
      [startDate, endDate]
    );

    const overview = overviewResult.rows[0];
    
    // Conversion rates
    const totalLeads = parseInt(overview.total_leads);
    const contactedToQualified = overview.contacted_count > 0
      ? ((parseInt(overview.qualified_count) / parseInt(overview.contacted_count)) * 100).toFixed(2)
      : '0.00';
    const qualifiedToConverted = overview.qualified_count > 0
      ? ((parseInt(overview.converted_count) / parseInt(overview.qualified_count)) * 100).toFixed(2)
      : '0.00';
    const overallConversion = totalLeads > 0
      ? ((parseInt(overview.converted_count) / totalLeads) * 100).toFixed(2)
      : '0.00';

    // 2. Kaynak Bazlı Analiz (Network, Site, Campaign)
    const sourceAnalysisResult = await db.query(
      `SELECT 
        CASE 
          WHEN network_id IS NOT NULL THEN 'network'
          WHEN site_id IS NOT NULL THEN 'site'
          WHEN campaign_id IS NOT NULL THEN 'campaign'
          ELSE 'direct'
        END as source,
        COUNT(*) as lead_count,
        COUNT(CASE WHEN status = 'converted' THEN 1 END) as conversions,
        AVG(call_count) as avg_calls,
        AVG(CASE 
          WHEN status = 'converted' AND converted_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (converted_at - created_at))/86400 
        END) as avg_days_to_convert
      FROM leads
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY source
      ORDER BY lead_count DESC`,
      [startDate, endDate]
    );

    const sourceAnalysis = sourceAnalysisResult.rows.map(row => ({
      source: row.source,
      lead_count: parseInt(row.lead_count),
      conversions: parseInt(row.conversions),
      conversion_rate: row.lead_count > 0
        ? `${((parseInt(row.conversions) / parseInt(row.lead_count)) * 100).toFixed(2)}%`
        : '0.00%',
      avg_calls: parseFloat(row.avg_calls || 0).toFixed(2),
      avg_days_to_convert: parseFloat(row.avg_days_to_convert || 0).toFixed(2),
    }));

    // 3. Zaman Bazlı Trend Analizi
    let dateGroupFormat: string;
    switch (query.group_by) {
      case 'day':
        dateGroupFormat = 'DATE(created_at)';
        break;
      case 'week':
        dateGroupFormat = "DATE_TRUNC('week', created_at)";
        break;
      case 'month':
        dateGroupFormat = "DATE_TRUNC('month', created_at)";
        break;
      default:
        dateGroupFormat = 'DATE(created_at)';
    }

    const trendsResult = await db.query(
      `SELECT 
        ${dateGroupFormat} as period,
        COUNT(*) as leads,
        COUNT(CASE WHEN status = 'new' THEN 1 END) as new_leads,
        COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contacted,
        COUNT(CASE WHEN status = 'qualified' THEN 1 END) as qualified,
        COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
      FROM leads
      WHERE created_at >= $1 AND created_at <= $2 ${sourceFilter}
      GROUP BY period
      ORDER BY period ASC`,
      [startDate, endDate]
    );

    const trends = trendsResult.rows.map(row => ({
      period: row.period,
      leads: parseInt(row.leads),
      new_leads: parseInt(row.new_leads),
      contacted: parseInt(row.contacted),
      qualified: parseInt(row.qualified),
      converted: parseInt(row.converted),
      rejected: parseInt(row.rejected),
      conversion_rate: row.leads > 0
        ? `${((parseInt(row.converted) / parseInt(row.leads)) * 100).toFixed(2)}%`
        : '0.00%',
    }));

    // 4. Status Geçiş Analizi (Funnel)
    const funnelResult = await db.query(
      `WITH status_transitions AS (
        SELECT 
          COUNT(*) as total_created,
          COUNT(CASE WHEN status != 'new' THEN 1 END) as reached_contacted,
          COUNT(CASE WHEN status IN ('qualified', 'converted') THEN 1 END) as reached_qualified,
          COUNT(CASE WHEN status = 'converted' THEN 1 END) as reached_converted
        FROM leads
        WHERE created_at >= $1 AND created_at <= $2 ${sourceFilter}
      )
      SELECT 
        total_created,
        reached_contacted,
        reached_qualified,
        reached_converted,
        CASE WHEN total_created > 0 THEN (reached_contacted::float / total_created * 100) ELSE 0 END as contacted_rate,
        CASE WHEN reached_contacted > 0 THEN (reached_qualified::float / reached_contacted * 100) ELSE 0 END as qualified_rate,
        CASE WHEN reached_qualified > 0 THEN (reached_converted::float / reached_qualified * 100) ELSE 0 END as converted_rate,
        CASE WHEN total_created > 0 THEN (reached_converted::float / total_created * 100) ELSE 0 END as overall_conversion_rate
      FROM status_transitions`,
      [startDate, endDate]
    );

    const funnel = funnelResult.rows[0];

    // 5. Top Performing Networks (Lead kalitesi açısından)
    const topNetworksResult = await db.query(
      `SELECT 
        n.id,
        n.name,
        COUNT(l.id) as lead_count,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as conversions,
        AVG(l.call_count) as avg_calls,
        AVG(CASE 
          WHEN l.status = 'converted' AND l.converted_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (l.converted_at - l.created_at))/86400 
        END) as avg_days_to_convert,
        n.cost_per_lead * COUNT(l.id) as total_cost,
        CASE 
          WHEN COUNT(CASE WHEN l.status = 'converted' THEN 1 END) > 0 
          THEN (n.cost_per_lead * COUNT(l.id)) / COUNT(CASE WHEN l.status = 'converted' THEN 1 END)
          ELSE 0 
        END as cost_per_conversion
      FROM networks n
      JOIN leads l ON l.network_id = n.id
      WHERE l.created_at >= $1 AND l.created_at <= $2
      GROUP BY n.id, n.name, n.cost_per_lead
      HAVING COUNT(l.id) >= 5
      ORDER BY (COUNT(CASE WHEN l.status = 'converted' THEN 1 END)::float / COUNT(l.id)) DESC
      LIMIT 10`,
      [startDate, endDate]
    );

    const topNetworks = topNetworksResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      lead_count: parseInt(row.lead_count),
      conversions: parseInt(row.conversions),
      conversion_rate: row.lead_count > 0
        ? `${((parseInt(row.conversions) / parseInt(row.lead_count)) * 100).toFixed(2)}%`
        : '0.00%',
      avg_calls: parseFloat(row.avg_calls || 0).toFixed(2),
      avg_days_to_convert: parseFloat(row.avg_days_to_convert || 0).toFixed(2),
      total_cost: parseFloat(row.total_cost || 0).toFixed(2),
      cost_per_conversion: parseFloat(row.cost_per_conversion || 0).toFixed(2),
      quality_score: calculateQualityScore(
        parseInt(row.conversions),
        parseInt(row.lead_count),
        parseFloat(row.avg_days_to_convert || 0),
        parseFloat(row.cost_per_conversion || 0)
      ),
    }));

    // 6. Top Performing Sites
    const topSitesResult = await db.query(
      `SELECT 
        s.id,
        s.name,
        s.url,
        COUNT(l.id) as lead_count,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as conversions,
        AVG(l.call_count) as avg_calls
      FROM sites s
      JOIN leads l ON l.site_id = s.id
      WHERE l.created_at >= $1 AND l.created_at <= $2
      GROUP BY s.id, s.name, s.url
      HAVING COUNT(l.id) >= 3
      ORDER BY (COUNT(CASE WHEN l.status = 'converted' THEN 1 END)::float / COUNT(l.id)) DESC
      LIMIT 10`,
      [startDate, endDate]
    );

    const topSites = topSitesResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      url: row.url,
      lead_count: parseInt(row.lead_count),
      conversions: parseInt(row.conversions),
      conversion_rate: row.lead_count > 0
        ? `${((parseInt(row.conversions) / parseInt(row.lead_count)) * 100).toFixed(2)}%`
        : '0.00%',
      avg_calls: parseFloat(row.avg_calls || 0).toFixed(2),
    }));

    // 7. Lead Quality Distribution (Response time bazlı)
    const qualityDistributionResult = await db.query(
      `SELECT 
        CASE 
          WHEN last_contact_at IS NULL THEN 'no_contact'
          WHEN EXTRACT(EPOCH FROM (last_contact_at - created_at))/3600 <= 1 THEN 'excellent'
          WHEN EXTRACT(EPOCH FROM (last_contact_at - created_at))/3600 <= 24 THEN 'good'
          WHEN EXTRACT(EPOCH FROM (last_contact_at - created_at))/3600 <= 72 THEN 'average'
          ELSE 'poor'
        END as response_quality,
        COUNT(*) as count,
        COUNT(CASE WHEN status = 'converted' THEN 1 END) as conversions
      FROM leads
      WHERE created_at >= $1 AND created_at <= $2 ${sourceFilter}
      GROUP BY response_quality
      ORDER BY 
        CASE response_quality
          WHEN 'excellent' THEN 1
          WHEN 'good' THEN 2
          WHEN 'average' THEN 3
          WHEN 'poor' THEN 4
          WHEN 'no_contact' THEN 5
        END`,
      [startDate, endDate]
    );

    const qualityDistribution = qualityDistributionResult.rows.map(row => ({
      quality: row.response_quality,
      count: parseInt(row.count),
      conversions: parseInt(row.conversions),
      conversion_rate: row.count > 0
        ? `${((parseInt(row.conversions) / parseInt(row.count)) * 100).toFixed(2)}%`
        : '0.00%',
    }));

    // 8. Call Activity Analysis
    const callAnalysisResult = await db.query(
      `SELECT 
        AVG(call_count) as avg_calls_per_lead,
        MAX(call_count) as max_calls,
        COUNT(CASE WHEN call_count = 0 THEN 1 END) as leads_no_calls,
        COUNT(CASE WHEN call_count BETWEEN 1 AND 3 THEN 1 END) as leads_1_3_calls,
        COUNT(CASE WHEN call_count BETWEEN 4 AND 6 THEN 1 END) as leads_4_6_calls,
        COUNT(CASE WHEN call_count > 6 THEN 1 END) as leads_7plus_calls,
        AVG(CASE WHEN status = 'converted' THEN call_count END) as avg_calls_converted,
        AVG(CASE WHEN status = 'rejected' THEN call_count END) as avg_calls_rejected
      FROM leads
      WHERE created_at >= $1 AND created_at <= $2 ${sourceFilter}`,
      [startDate, endDate]
    );

    const callAnalysis = callAnalysisResult.rows[0];

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
        filters: {
          source_type: query.source_type,
          status: query.status,
        },

        // Genel özet
        overview: {
          total_leads: totalLeads,
          status_breakdown: {
            new: parseInt(overview.new_count),
            contacted: parseInt(overview.contacted_count),
            qualified: parseInt(overview.qualified_count),
            converted: parseInt(overview.converted_count),
            rejected: parseInt(overview.rejected_count),
          },
          conversion_metrics: {
            contacted_to_qualified: `${contactedToQualified}%`,
            qualified_to_converted: `${qualifiedToConverted}%`,
            overall_conversion: `${overallConversion}%`,
          },
          performance_metrics: {
            avg_days_to_convert: parseFloat(overview.avg_days_to_convert || 0).toFixed(2),
            avg_calls_per_lead: parseFloat(overview.avg_calls_per_lead || 0).toFixed(2),
            contacted_leads_percent: totalLeads > 0
              ? `${((parseInt(overview.contacted_leads) / totalLeads) * 100).toFixed(2)}%`
              : '0.00%',
            avg_first_response_hours: parseFloat(overview.avg_first_response_hours || 0).toFixed(2),
          },
        },

        // Kaynak analizi
        source_analysis: sourceAnalysis,

        // Trend verileri
        trends: trends,

        // Conversion funnel
        funnel: {
          stages: [
            {
              name: 'Created',
              count: parseInt(funnel.total_created),
              percentage: '100.00%',
            },
            {
              name: 'Contacted',
              count: parseInt(funnel.reached_contacted),
              percentage: `${parseFloat(funnel.contacted_rate).toFixed(2)}%`,
              drop_off: parseInt(funnel.total_created) - parseInt(funnel.reached_contacted),
            },
            {
              name: 'Qualified',
              count: parseInt(funnel.reached_qualified),
              percentage: `${parseFloat(funnel.qualified_rate).toFixed(2)}%`,
              drop_off: parseInt(funnel.reached_contacted) - parseInt(funnel.reached_qualified),
            },
            {
              name: 'Converted',
              count: parseInt(funnel.reached_converted),
              percentage: `${parseFloat(funnel.converted_rate).toFixed(2)}%`,
              drop_off: parseInt(funnel.reached_qualified) - parseInt(funnel.reached_converted),
            },
          ],
          overall_conversion_rate: `${parseFloat(funnel.overall_conversion_rate).toFixed(2)}%`,
        },

        // Top performers
        top_networks: topNetworks,
        top_sites: topSites,

        // Kalite dağılımı
        quality_distribution: qualityDistribution,

        // Call analizi
        call_analysis: {
          avg_calls_per_lead: parseFloat(callAnalysis.avg_calls_per_lead || 0).toFixed(2),
          max_calls: parseInt(callAnalysis.max_calls || 0),
          distribution: {
            no_calls: parseInt(callAnalysis.leads_no_calls || 0),
            calls_1_3: parseInt(callAnalysis.leads_1_3_calls || 0),
            calls_4_6: parseInt(callAnalysis.leads_4_6_calls || 0),
            calls_7_plus: parseInt(callAnalysis.leads_7plus_calls || 0),
          },
          avg_calls_by_outcome: {
            converted: parseFloat(callAnalysis.avg_calls_converted || 0).toFixed(2),
            rejected: parseFloat(callAnalysis.avg_calls_rejected || 0).toFixed(2),
          },
        },

        // Insights ve öneriler
        insights: generateLeadInsights(
          totalLeads,
          parseInt(overview.converted_count),
          parseFloat(overview.avg_first_response_hours || 0),
          sourceAnalysis,
          qualityDistribution
        ),
      },
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error: any) {
    console.error('Lead analytics error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch lead analytics' },
      { status: 500 }
    );
  }
}

/**
 * Lead kalite skoru hesaplama
 * Faktörler: conversion rate, speed to convert, cost efficiency
 */
function calculateQualityScore(
  conversions: number,
  totalLeads: number,
  avgDaysToConvert: number,
  costPerConversion: number
): string {
  let score = 0;
  
  // Conversion rate (40 puan)
  const conversionRate = totalLeads > 0 ? (conversions / totalLeads) * 100 : 0;
  score += Math.min(conversionRate * 2, 40);
  
  // Speed to convert (30 puan - daha hızlı daha iyi)
  if (avgDaysToConvert > 0) {
    const speedScore = Math.max(0, 30 - (avgDaysToConvert * 2));
    score += speedScore;
  }
  
  // Cost efficiency (30 puan - daha düşük maliyet daha iyi)
  if (costPerConversion > 0) {
    const costScore = Math.max(0, 30 - (costPerConversion / 10));
    score += costScore;
  } else {
    score += 30; // Eğer maliyet yoksa full puan
  }
  
  return Math.min(score, 100).toFixed(1);
}

/**
 * Lead insights ve öneriler oluşturma
 */
function generateLeadInsights(
  totalLeads: number,
  conversions: number,
  avgResponseHours: number,
  sourceAnalysis: any[],
  qualityDistribution: any[]
): string[] {
  const insights: string[] = [];
  
  // Conversion rate insights
  const conversionRate = totalLeads > 0 ? (conversions / totalLeads) * 100 : 0;
  if (conversionRate < 5) {
    insights.push('⚠️ Düşük conversion oranı. Lead kalitesi ve takip süreçlerini gözden geçirin.');
  } else if (conversionRate > 15) {
    insights.push('✅ Mükemmel conversion oranı! Mevcut stratejileri koruyun.');
  }
  
  // Response time insights
  if (avgResponseHours > 24) {
    insights.push('🚨 İlk yanıt süresi çok yüksek. Daha hızlı yanıt vermek conversion\'ı artırabilir.');
  } else if (avgResponseHours < 2) {
    insights.push('⚡ Harika yanıt süresi! Bu hızlı takip conversion\'ınızı artırıyor.');
  }
  
  // Source analysis insights
  const bestSource = sourceAnalysis.reduce((best, current) => 
    current.lead_count > best.lead_count ? current : best
  , sourceAnalysis[0] || { source: 'none', lead_count: 0 });
  
  if (bestSource.source !== 'none') {
    insights.push(`📊 En çok lead ${bestSource.source} kaynağından geliyor (${bestSource.lead_count} lead).`);
  }
  
  // Quality distribution insights
  const noContact = qualityDistribution.find(q => q.quality === 'no_contact');
  if (noContact && noContact.count > totalLeads * 0.3) {
    insights.push('📞 Lead\'lerin %30\'undan fazlasıyla hiç iletişime geçilmemiş. Takip süreçlerini iyileştirin.');
  }
  
  return insights;
}
