import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import db from '@/lib/db';

/**
 * GET /api/analytics/networks
 * 
 * Network performans karşılaştırma ve analizi:
 * - Network'ler arası detaylı karşılaştırma
 * - Maliyet etkinlik analizi (ROI, cost per lead/conversion)
 * - Lead kalite skorlaması
 * - Conversion rate rankings
 * - Zaman bazlı performans trendleri
 * - Payment history ve outstanding balances
 * 
 * Query Parameters:
 * - date_range: today, week, month, year, custom
 * - start_date: YYYY-MM-DD (for custom range)
 * - end_date: YYYY-MM-DD (for custom range)
 * - status: active, inactive, all (filter by network status)
 * - sort_by: leads, conversions, conversion_rate, cost_efficiency, quality_score
 * - order: asc, desc
 * - min_leads: (optional) Minimum lead count filter
 */

const querySchema = z.object({
  date_range: z.enum(['today', 'week', 'month', 'year', 'custom']).optional().default('month'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  status: z.enum(['active', 'inactive', 'all']).optional().default('all'),
  sort_by: z.enum(['leads', 'conversions', 'conversion_rate', 'cost_efficiency', 'quality_score']).optional().default('leads'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  min_leads: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = querySchema.parse({
      date_range: searchParams.get('date_range') || 'month',
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      status: searchParams.get('status') || 'all',
      sort_by: searchParams.get('sort_by') || 'leads',
      order: searchParams.get('order') || 'desc',
      min_leads: searchParams.get('min_leads') || undefined,
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

    // Status filter
    const statusFilter = query.status !== 'all' ? `AND n.status = '${query.status}'` : '';

    // Min leads filter
    const minLeadsFilter = query.min_leads ? `HAVING COUNT(l.id) >= ${parseInt(query.min_leads)}` : '';

    // 1. Genel Network İstatistikleri
    const overviewResult = await db.query(
      `SELECT 
        COUNT(DISTINCT n.id) as total_networks,
        COUNT(DISTINCT CASE WHEN n.status = 'active' THEN n.id END) as active_networks,
        COUNT(l.id) as total_leads,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as total_conversions,
        COALESCE(SUM(n.cost_per_lead * (
          SELECT COUNT(*) FROM leads WHERE network_id = n.id 
          AND created_at >= $1 AND created_at <= $2
        )), 0) as total_cost,
        AVG(n.cost_per_lead) as avg_cost_per_lead
      FROM networks n
      LEFT JOIN leads l ON l.network_id = n.id 
        AND l.created_at >= $1 AND l.created_at <= $2
      WHERE 1=1 ${statusFilter}`,
      [startDate, endDate]
    );

    const overview = overviewResult.rows[0];
    const totalLeads = parseInt(overview.total_leads);
    const totalConversions = parseInt(overview.total_conversions);
    const totalCost = parseFloat(overview.total_cost);
    
    const overallConversionRate = totalLeads > 0 
      ? ((totalConversions / totalLeads) * 100).toFixed(2)
      : '0.00';
    const avgCostPerConversion = totalConversions > 0
      ? (totalCost / totalConversions).toFixed(2)
      : '0.00';

    // 2. Detaylı Network Performans Listesi
    let orderByClause: string;
    switch (query.sort_by) {
      case 'leads':
        orderByClause = 'lead_count';
        break;
      case 'conversions':
        orderByClause = 'conversions';
        break;
      case 'conversion_rate':
        orderByClause = 'conversion_rate';
        break;
      case 'cost_efficiency':
        orderByClause = 'cost_per_conversion';
        break;
      case 'quality_score':
        orderByClause = 'quality_score';
        break;
      default:
        orderByClause = 'lead_count';
    }

    const networksResult = await db.query(
      `SELECT 
        n.id,
        n.name,
        n.status,
        n.cost_per_lead,
        n.contact_person,
        n.contact_email,
        n.created_at as network_created_at,
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
        n.cost_per_lead * COUNT(l.id) as total_cost,
        CASE 
          WHEN COUNT(CASE WHEN l.status = 'converted' THEN 1 END) > 0 
          THEN (n.cost_per_lead * COUNT(l.id)) / COUNT(CASE WHEN l.status = 'converted' THEN 1 END)
          ELSE 0 
        END as cost_per_conversion,
        AVG(l.call_count) as avg_calls_per_lead,
        AVG(CASE 
          WHEN l.status = 'converted' AND l.converted_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (l.converted_at - l.created_at))/86400 
        END) as avg_days_to_convert,
        AVG(CASE 
          WHEN l.last_contact_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (l.last_contact_at - l.created_at))/3600 
        END) as avg_response_hours,
        MAX(l.created_at) as last_lead_date
      FROM networks n
      LEFT JOIN leads l ON l.network_id = n.id 
        AND l.created_at >= $1 AND l.created_at <= $2
      WHERE 1=1 ${statusFilter}
      GROUP BY n.id, n.name, n.status, n.cost_per_lead, n.contact_person, n.contact_email, n.created_at
      ${minLeadsFilter}
      ORDER BY ${orderByClause} ${query.order.toUpperCase()}`,
      [startDate, endDate]
    );

    const networks = networksResult.rows.map(row => {
      const leadCount = parseInt(row.lead_count);
      const conversions = parseInt(row.conversions);
      const conversionRate = parseFloat(row.conversion_rate);
      const costPerConversion = parseFloat(row.cost_per_conversion);
      const avgDaysToConvert = parseFloat(row.avg_days_to_convert || 0);
      
      // Quality score hesaplama
      const qualityScore = calculateNetworkQualityScore(
        conversionRate,
        avgDaysToConvert,
        costPerConversion,
        parseFloat(row.avg_response_hours || 0),
        parseInt(row.rejected_leads)
      );

      return {
        id: row.id,
        name: row.name,
        status: row.status,
        contact: {
          person: row.contact_person,
          email: row.contact_email,
        },
        pricing: {
          cost_per_lead: parseFloat(row.cost_per_lead),
          total_cost: parseFloat(row.total_cost).toFixed(2),
          cost_per_conversion: costPerConversion > 0 ? costPerConversion.toFixed(2) : 'N/A',
        },
        performance: {
          lead_count: leadCount,
          status_breakdown: {
            new: parseInt(row.new_leads),
            contacted: parseInt(row.contacted_leads),
            qualified: parseInt(row.qualified_leads),
            converted: conversions,
            rejected: parseInt(row.rejected_leads),
          },
          conversion_rate: `${conversionRate.toFixed(2)}%`,
          quality_score: qualityScore,
          rank: '', // Will be set after sorting
        },
        metrics: {
          avg_calls_per_lead: parseFloat(row.avg_calls_per_lead || 0).toFixed(2),
          avg_days_to_convert: avgDaysToConvert.toFixed(2),
          avg_response_hours: parseFloat(row.avg_response_hours || 0).toFixed(2),
        },
        timeline: {
          network_created_at: row.network_created_at,
          last_lead_date: row.last_lead_date,
          days_active: row.network_created_at 
            ? Math.floor((endDate.getTime() - new Date(row.network_created_at).getTime()) / (1000 * 60 * 60 * 24))
            : 0,
        },
      };
    });

    // Ranking ekle
    networks.forEach((network, index) => {
      network.performance.rank = `#${index + 1}`;
    });

    // 3. Network Karşılaştırma Matrisi (Top 5)
    const top5Networks = networks.slice(0, 5);
    const comparisonMatrix = {
      networks: top5Networks.map(n => n.name),
      metrics: {
        lead_count: top5Networks.map(n => n.performance.lead_count),
        conversions: top5Networks.map(n => n.performance.status_breakdown.converted),
        conversion_rate: top5Networks.map(n => parseFloat(n.performance.conversion_rate)),
        cost_per_lead: top5Networks.map(n => n.pricing.cost_per_lead),
        quality_score: top5Networks.map(n => parseFloat(n.performance.quality_score)),
      },
    };

    // 4. Zaman Bazlı Trend (Son 30 gün için her network)
    const trendsResult = await db.query(
      `SELECT 
        n.id as network_id,
        n.name as network_name,
        DATE(l.created_at) as date,
        COUNT(l.id) as daily_leads,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as daily_conversions
      FROM networks n
      LEFT JOIN leads l ON l.network_id = n.id 
        AND l.created_at >= NOW() - INTERVAL '30 days'
      WHERE n.status = 'active'
      GROUP BY n.id, n.name, DATE(l.created_at)
      ORDER BY n.name, date DESC`,
      []
    );

    // Network ID'ye göre grupla
    const trendsByNetwork: Record<number, any[]> = {};
    trendsResult.rows.forEach(row => {
      if (!trendsByNetwork[row.network_id]) {
        trendsByNetwork[row.network_id] = [];
      }
      if (row.date) {  // Null date'leri atla
        trendsByNetwork[row.network_id].push({
          date: row.date,
          leads: parseInt(row.daily_leads),
          conversions: parseInt(row.daily_conversions),
        });
      }
    });

    // 5. Best & Worst Performers
    const bestByConversion = networks.filter(n => n.performance.lead_count >= 5)
      .sort((a, b) => parseFloat(b.performance.conversion_rate) - parseFloat(a.performance.conversion_rate))
      .slice(0, 3);

    const bestByCostEfficiency = networks.filter(n => n.performance.status_breakdown.converted > 0)
      .sort((a, b) => {
        const costA = a.pricing.cost_per_conversion === 'N/A' ? Infinity : parseFloat(a.pricing.cost_per_conversion);
        const costB = b.pricing.cost_per_conversion === 'N/A' ? Infinity : parseFloat(b.pricing.cost_per_conversion);
        return costA - costB;
      })
      .slice(0, 3);

    const worstByQuality = networks.filter(n => n.performance.lead_count >= 5)
      .sort((a, b) => parseFloat(a.performance.quality_score) - parseFloat(b.performance.quality_score))
      .slice(0, 3);

    // 6. Payment & Cost Analysis
    const paymentAnalysisResult = await db.query(
      `SELECT 
        n.id,
        n.name,
        COUNT(np.id) as payment_count,
        COALESCE(SUM(np.amount), 0) as total_paid,
        n.cost_per_lead * COUNT(l.id) as total_due,
        n.cost_per_lead * COUNT(l.id) - COALESCE(SUM(np.amount), 0) as outstanding_balance
      FROM networks n
      LEFT JOIN network_payments np ON np.network_id = n.id
      LEFT JOIN leads l ON l.network_id = n.id 
        AND l.created_at >= $1 AND l.created_at <= $2
      WHERE n.status = 'active'
      GROUP BY n.id, n.name, n.cost_per_lead
      HAVING COUNT(l.id) > 0
      ORDER BY outstanding_balance DESC`,
      [startDate, endDate]
    );

    const paymentAnalysis = paymentAnalysisResult.rows.map(row => ({
      network_id: row.id,
      network_name: row.name,
      payment_count: parseInt(row.payment_count),
      total_paid: parseFloat(row.total_paid).toFixed(2),
      total_due: parseFloat(row.total_due).toFixed(2),
      outstanding_balance: parseFloat(row.outstanding_balance).toFixed(2),
      payment_status: parseFloat(row.outstanding_balance) > 0 ? 'pending' : 'paid',
    }));

    // 7. Insights ve Öneriler
    const insights = generateNetworkInsights(
      networks,
      totalLeads,
      totalConversions,
      totalCost,
      paymentAnalysis
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
          status: query.status,
          sort_by: query.sort_by,
          order: query.order,
          min_leads: query.min_leads,
        },

        // Genel özet
        overview: {
          total_networks: parseInt(overview.total_networks),
          active_networks: parseInt(overview.active_networks),
          total_leads: totalLeads,
          total_conversions: totalConversions,
          overall_conversion_rate: `${overallConversionRate}%`,
          total_cost: totalCost.toFixed(2),
          avg_cost_per_lead: parseFloat(overview.avg_cost_per_lead || 0).toFixed(2),
          avg_cost_per_conversion: avgCostPerConversion,
        },

        // Network listesi
        networks: networks,

        // Karşılaştırma matrisi
        comparison_matrix: comparisonMatrix,

        // Trend verileri
        trends_by_network: trendsByNetwork,

        // Best & Worst performers
        rankings: {
          best_by_conversion: bestByConversion.map(n => ({
            id: n.id,
            name: n.name,
            conversion_rate: n.performance.conversion_rate,
            lead_count: n.performance.lead_count,
          })),
          best_by_cost_efficiency: bestByCostEfficiency.map(n => ({
            id: n.id,
            name: n.name,
            cost_per_conversion: n.pricing.cost_per_conversion,
            conversions: n.performance.status_breakdown.converted,
          })),
          worst_by_quality: worstByQuality.map(n => ({
            id: n.id,
            name: n.name,
            quality_score: n.performance.quality_score,
            issues: identifyQualityIssues(n),
          })),
        },

        // Payment analizi
        payment_analysis: paymentAnalysis,

        // Insights
        insights: insights,
      },
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error: any) {
    console.error('Network analytics error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch network analytics' },
      { status: 500 }
    );
  }
}

/**
 * Network kalite skoru hesaplama
 */
function calculateNetworkQualityScore(
  conversionRate: number,
  avgDaysToConvert: number,
  costPerConversion: number,
  avgResponseHours: number,
  rejectedLeads: number
): string {
  let score = 0;
  
  // Conversion rate (35 puan)
  score += Math.min(conversionRate * 1.75, 35);
  
  // Speed to convert (25 puan)
  if (avgDaysToConvert > 0) {
    const speedScore = Math.max(0, 25 - (avgDaysToConvert * 1.5));
    score += speedScore;
  } else if (conversionRate > 0) {
    score += 25; // Eğer conversion var ama süre yoksa full puan
  }
  
  // Cost efficiency (25 puan)
  if (costPerConversion > 0) {
    const costScore = Math.max(0, 25 - (costPerConversion / 20));
    score += costScore;
  } else if (conversionRate > 0) {
    score += 25;
  }
  
  // Response quality (15 puan)
  if (avgResponseHours > 0) {
    if (avgResponseHours <= 2) score += 15;
    else if (avgResponseHours <= 24) score += 10;
    else if (avgResponseHours <= 72) score += 5;
  }
  
  // Rejection penalty (maksimum -10 puan)
  const rejectionPenalty = Math.min(rejectedLeads * 0.5, 10);
  score -= rejectionPenalty;
  
  return Math.max(0, Math.min(score, 100)).toFixed(1);
}

/**
 * Network'teki kalite problemlerini tespit et
 */
function identifyQualityIssues(network: any): string[] {
  const issues: string[] = [];
  
  const convRate = parseFloat(network.performance.conversion_rate);
  if (convRate < 5) {
    issues.push('Çok düşük conversion oranı');
  }
  
  const rejectionRate = network.performance.lead_count > 0
    ? (network.performance.status_breakdown.rejected / network.performance.lead_count) * 100
    : 0;
  if (rejectionRate > 30) {
    issues.push('Yüksek rejection oranı');
  }
  
  const avgDays = parseFloat(network.metrics.avg_days_to_convert);
  if (avgDays > 14) {
    issues.push('Conversion süresi çok uzun');
  }
  
  const responseHours = parseFloat(network.metrics.avg_response_hours);
  if (responseHours > 48) {
    issues.push('Yavaş yanıt süresi');
  }
  
  return issues;
}

/**
 * Network insights ve öneriler oluştur
 */
function generateNetworkInsights(
  networks: any[],
  totalLeads: number,
  totalConversions: number,
  totalCost: number,
  paymentAnalysis: any[]
): string[] {
  const insights: string[] = [];
  
  // Active network sayısı
  const activeNetworks = networks.filter(n => n.status === 'active');
  if (activeNetworks.length < 3) {
    insights.push('⚠️ Az sayıda aktif network var. Lead kaynaklarını çeşitlendirmeyi düşünün.');
  }
  
  // Top performer
  if (networks.length > 0) {
    const best = networks[0];
    insights.push(`🏆 En iyi network: ${best.name} (${best.performance.conversion_rate} conversion rate)`);
  }
  
  // Cost analysis
  const avgCostPerConv = totalConversions > 0 ? totalCost / totalConversions : 0;
  if (avgCostPerConv > 200) {
    insights.push('💰 Ortalama conversion maliyeti yüksek. Daha uygun maliyetli networkler arayın.');
  }
  
  // Payment issues
  const outstandingTotal = paymentAnalysis.reduce((sum, p) => sum + parseFloat(p.outstanding_balance), 0);
  if (outstandingTotal > 1000) {
    insights.push(`💳 Toplam ${outstandingTotal.toFixed(2)} TL ödenmemiş bakiye var.`);
  }
  
  // Low quality networks
  const lowQualityCount = networks.filter(n => parseFloat(n.performance.quality_score) < 50).length;
  if (lowQualityCount > 0) {
    insights.push(`🚨 ${lowQualityCount} network düşük kalite skoruna sahip. İnceleme gerekebilir.`);
  }
  
  return insights;
}
