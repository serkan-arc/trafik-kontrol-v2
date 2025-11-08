import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import db from '@/lib/db';

/**
 * GET /api/analytics/conversion
 * 
 * Conversion Funnel Analizi:
 * - Full funnel visualization (New → Contacted → Qualified → Converted)
 * - Drop-off rates at each stage
 * - Stage-to-stage conversion rates
 * - Time spent in each stage
 * - Bottleneck identification
 * - Funnel comparison by source/campaign
 * - Optimization recommendations
 * 
 * Query Parameters:
 * - date_range: today, week, month, quarter, year, custom
 * - start_date: YYYY-MM-DD (for custom range)
 * - end_date: YYYY-MM-DD (for custom range)
 * - source_type: network, site, campaign, direct, all (funnel by source)
 * - source_id: (optional) Specific network/site/campaign ID
 * - compare_sources: true/false (compare funnels across sources)
 */

const querySchema = z.object({
  date_range: z.enum(['today', 'week', 'month', 'quarter', 'year', 'custom']).optional().default('month'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  source_type: z.enum(['network', 'site', 'campaign', 'direct', 'all']).optional().default('all'),
  source_id: z.string().optional(),
  compare_sources: z.enum(['true', 'false']).optional().default('false'),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = querySchema.parse({
      date_range: searchParams.get('date_range') || 'month',
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      source_type: searchParams.get('source_type') || 'all',
      source_id: searchParams.get('source_id') || undefined,
      compare_sources: searchParams.get('compare_sources') || 'false',
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

    // Source filter
    let sourceFilter = '';
    if (query.source_type !== 'all') {
      if (query.source_id) {
        switch (query.source_type) {
          case 'network':
            sourceFilter = `AND network_id = ${parseInt(query.source_id)}`;
            break;
          case 'site':
            sourceFilter = `AND site_id = ${parseInt(query.source_id)}`;
            break;
          case 'campaign':
            sourceFilter = `AND campaign_id = ${parseInt(query.source_id)}`;
            break;
        }
      } else {
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
    }

    // 1. Main Conversion Funnel
    const funnelResult = await db.query(
      `WITH funnel_stages AS (
        SELECT 
          COUNT(*) as total_leads,
          COUNT(CASE WHEN status IN ('contacted', 'qualified', 'converted') THEN 1 END) as reached_contacted,
          COUNT(CASE WHEN status IN ('qualified', 'converted') THEN 1 END) as reached_qualified,
          COUNT(CASE WHEN status = 'converted' THEN 1 END) as reached_converted,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
          COUNT(CASE WHEN status = 'new' THEN 1 END) as still_new
        FROM leads
        WHERE created_at >= $1 AND created_at <= $2 ${sourceFilter}
      )
      SELECT 
        total_leads,
        reached_contacted,
        reached_qualified,
        reached_converted,
        rejected,
        still_new,
        CASE WHEN total_leads > 0 THEN (reached_contacted::float / total_leads * 100) ELSE 0 END as contacted_rate,
        CASE WHEN reached_contacted > 0 THEN (reached_qualified::float / reached_contacted * 100) ELSE 0 END as qualified_rate,
        CASE WHEN reached_qualified > 0 THEN (reached_converted::float / reached_qualified * 100) ELSE 0 END as converted_rate,
        CASE WHEN total_leads > 0 THEN (reached_converted::float / total_leads * 100) ELSE 0 END as overall_conversion_rate,
        CASE WHEN total_leads > 0 THEN (rejected::float / total_leads * 100) ELSE 0 END as rejection_rate
      FROM funnel_stages`,
      [startDate, endDate]
    );

    const funnel = funnelResult.rows[0];
    
    // Calculate drop-offs
    const dropOffNewToContacted = parseInt(funnel.total_leads) - parseInt(funnel.reached_contacted);
    const dropOffContactedToQualified = parseInt(funnel.reached_contacted) - parseInt(funnel.reached_qualified);
    const dropOffQualifiedToConverted = parseInt(funnel.reached_qualified) - parseInt(funnel.reached_converted);

    const mainFunnel = {
      stages: [
        {
          name: 'New Leads',
          count: parseInt(funnel.total_leads),
          percentage: '100.00%',
          retention_from_previous: '100.00%',
          drop_off: 0,
        },
        {
          name: 'Contacted',
          count: parseInt(funnel.reached_contacted),
          percentage: `${parseFloat(funnel.contacted_rate).toFixed(2)}%`,
          retention_from_previous: `${parseFloat(funnel.contacted_rate).toFixed(2)}%`,
          drop_off: dropOffNewToContacted,
        },
        {
          name: 'Qualified',
          count: parseInt(funnel.reached_qualified),
          percentage: `${(parseInt(funnel.reached_qualified) / parseInt(funnel.total_leads) * 100).toFixed(2)}%`,
          retention_from_previous: `${parseFloat(funnel.qualified_rate).toFixed(2)}%`,
          drop_off: dropOffContactedToQualified,
        },
        {
          name: 'Converted',
          count: parseInt(funnel.reached_converted),
          percentage: `${parseFloat(funnel.overall_conversion_rate).toFixed(2)}%`,
          retention_from_previous: `${parseFloat(funnel.converted_rate).toFixed(2)}%`,
          drop_off: dropOffQualifiedToConverted,
        },
      ],
      summary: {
        total_leads: parseInt(funnel.total_leads),
        conversions: parseInt(funnel.reached_converted),
        rejected: parseInt(funnel.rejected),
        still_in_funnel: parseInt(funnel.still_new) + parseInt(funnel.reached_contacted) - parseInt(funnel.reached_qualified),
        overall_conversion_rate: `${parseFloat(funnel.overall_conversion_rate).toFixed(2)}%`,
        rejection_rate: `${parseFloat(funnel.rejection_rate).toFixed(2)}%`,
      },
    };

    // 2. Average Time in Each Stage
    const stageTimeResult = await db.query(
      `SELECT 
        AVG(CASE 
          WHEN status IN ('contacted', 'qualified', 'converted') AND last_contact_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (last_contact_at - created_at))/3600 
        END) as avg_hours_to_contact,
        AVG(CASE 
          WHEN status IN ('qualified', 'converted') AND last_contact_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (COALESCE(converted_at, NOW()) - last_contact_at))/86400 
        END) as avg_days_to_qualify,
        AVG(CASE 
          WHEN status = 'converted' AND converted_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (converted_at - created_at))/86400 
        END) as avg_days_total_to_convert,
        AVG(call_count) as avg_calls_to_convert
      FROM leads
      WHERE created_at >= $1 AND created_at <= $2 ${sourceFilter}`,
      [startDate, endDate]
    );

    const stageTiming = stageTimeResult.rows[0];

    // 3. Bottleneck Analysis
    const bottlenecks: Array<{stage: string, issue: string, severity: 'high' | 'medium' | 'low'}> = [];
    
    // Check New → Contacted rate
    const contactedRate = parseFloat(funnel.contacted_rate);
    if (contactedRate < 50) {
      bottlenecks.push({
        stage: 'New → Contacted',
        issue: `Düşük iletişim oranı (%${contactedRate.toFixed(2)}). Lead'lerin yarısından fazlasıyla iletişime geçilemiyor.`,
        severity: 'high',
      });
    } else if (contactedRate < 70) {
      bottlenecks.push({
        stage: 'New → Contacted',
        issue: `Orta seviye iletişim oranı (%${contactedRate.toFixed(2)}). İyileştirme yapılabilir.`,
        severity: 'medium',
      });
    }
    
    // Check Contacted → Qualified rate
    const qualifiedRate = parseFloat(funnel.qualified_rate);
    if (qualifiedRate < 30) {
      bottlenecks.push({
        stage: 'Contacted → Qualified',
        issue: `Düşük nitelendirme oranı (%${qualifiedRate.toFixed(2)}). Lead kalitesi veya nitelendirme kriterleri gözden geçirilmeli.`,
        severity: 'high',
      });
    } else if (qualifiedRate < 50) {
      bottlenecks.push({
        stage: 'Contacted → Qualified',
        issue: `Orta seviye nitelendirme oranı (%${qualifiedRate.toFixed(2)}).`,
        severity: 'medium',
      });
    }
    
    // Check Qualified → Converted rate
    const convertedRate = parseFloat(funnel.converted_rate);
    if (convertedRate < 20) {
      bottlenecks.push({
        stage: 'Qualified → Converted',
        issue: `Düşük kapatma oranı (%${convertedRate.toFixed(2)}). Satış süreci ve takip stratejileri güçlendirilmeli.`,
        severity: 'high',
      });
    } else if (convertedRate < 40) {
      bottlenecks.push({
        stage: 'Qualified → Converted',
        issue: `Orta seviye kapatma oranı (%${convertedRate.toFixed(2)}).`,
        severity: 'medium',
      });
    }
    
    // Check response time
    const avgHoursToContact = parseFloat(stageTiming.avg_hours_to_contact || 0);
    if (avgHoursToContact > 24) {
      bottlenecks.push({
        stage: 'Response Time',
        issue: `Yavaş yanıt süresi (${avgHoursToContact.toFixed(1)} saat). İlk yanıt süresini kısaltmak conversion'ı artırabilir.`,
        severity: 'high',
      });
    } else if (avgHoursToContact > 6) {
      bottlenecks.push({
        stage: 'Response Time',
        issue: `Orta yanıt süresi (${avgHoursToContact.toFixed(1)} saat).`,
        severity: 'medium',
      });
    }

    // 4. Funnel by Source (if comparison enabled)
    let funnelComparison = null;
    if (query.compare_sources === 'true') {
      const sourceComparisonResult = await db.query(
        `SELECT 
          CASE 
            WHEN network_id IS NOT NULL THEN CONCAT('network_', network_id)
            WHEN site_id IS NOT NULL THEN CONCAT('site_', site_id)
            WHEN campaign_id IS NOT NULL THEN CONCAT('campaign_', campaign_id)
            ELSE 'direct'
          END as source_key,
          CASE 
            WHEN network_id IS NOT NULL THEN (SELECT name FROM networks WHERE id = network_id)
            WHEN site_id IS NOT NULL THEN (SELECT name FROM sites WHERE id = site_id)
            WHEN campaign_id IS NOT NULL THEN (SELECT name FROM campaigns WHERE id = campaign_id)
            ELSE 'Direct'
          END as source_name,
          COUNT(*) as total,
          COUNT(CASE WHEN status IN ('contacted', 'qualified', 'converted') THEN 1 END) as contacted,
          COUNT(CASE WHEN status IN ('qualified', 'converted') THEN 1 END) as qualified,
          COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted
        FROM leads
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY source_key, source_name
        HAVING COUNT(*) >= 5
        ORDER BY total DESC
        LIMIT 10`,
        [startDate, endDate]
      );

      funnelComparison = sourceComparisonResult.rows.map(row => ({
        source: row.source_name,
        total_leads: parseInt(row.total),
        contacted: parseInt(row.contacted),
        qualified: parseInt(row.qualified),
        converted: parseInt(row.converted),
        contacted_rate: row.total > 0 ? `${(parseInt(row.contacted) / parseInt(row.total) * 100).toFixed(2)}%` : '0.00%',
        qualified_rate: row.contacted > 0 ? `${(parseInt(row.qualified) / parseInt(row.contacted) * 100).toFixed(2)}%` : '0.00%',
        converted_rate: row.qualified > 0 ? `${(parseInt(row.converted) / parseInt(row.qualified) * 100).toFixed(2)}%` : '0.00%',
        overall_conversion: row.total > 0 ? `${(parseInt(row.converted) / parseInt(row.total) * 100).toFixed(2)}%` : '0.00%',
      }));
    }

    // 5. Funnel Performance Over Time (Last 7 days)
    const funnelTrendsResult = await db.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as new_leads,
        COUNT(CASE WHEN status IN ('contacted', 'qualified', 'converted') THEN 1 END) as contacted,
        COUNT(CASE WHEN status IN ('qualified', 'converted') THEN 1 END) as qualified,
        COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted
      FROM leads
      WHERE created_at >= NOW() - INTERVAL '7 days' ${sourceFilter}
      GROUP BY DATE(created_at)
      ORDER BY date DESC`,
      []
    );

    const funnelTrends = funnelTrendsResult.rows.map(row => ({
      date: row.date,
      new_leads: parseInt(row.new_leads),
      contacted: parseInt(row.contacted),
      qualified: parseInt(row.qualified),
      converted: parseInt(row.converted),
      conversion_rate: row.new_leads > 0 ? `${(parseInt(row.converted) / parseInt(row.new_leads) * 100).toFixed(2)}%` : '0.00%',
    }));

    // 6. Optimization Recommendations
    const recommendations = generateOptimizationRecommendations(
      bottlenecks,
      parseFloat(funnel.overall_conversion_rate),
      avgHoursToContact,
      parseFloat(stageTiming.avg_calls_to_convert || 0)
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
          source_type: query.source_type,
          source_id: query.source_id,
        },

        main_funnel: mainFunnel,

        stage_timing: {
          avg_hours_to_first_contact: parseFloat(stageTiming.avg_hours_to_contact || 0).toFixed(2),
          avg_days_to_qualify: parseFloat(stageTiming.avg_days_to_qualify || 0).toFixed(2),
          avg_days_total_to_convert: parseFloat(stageTiming.avg_days_total_to_convert || 0).toFixed(2),
          avg_calls_to_convert: parseFloat(stageTiming.avg_calls_to_convert || 0).toFixed(2),
        },

        bottlenecks: bottlenecks,

        funnel_by_source: funnelComparison,

        funnel_trends: funnelTrends,

        recommendations: recommendations,

        health_score: calculateFunnelHealthScore(
          parseFloat(funnel.overall_conversion_rate),
          avgHoursToContact,
          bottlenecks.filter(b => b.severity === 'high').length
        ),
      },
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error: any) {
    console.error('Conversion analytics error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch conversion analytics' },
      { status: 500 }
    );
  }
}

/**
 * Optimizasyon önerileri oluştur
 */
function generateOptimizationRecommendations(
  bottlenecks: any[],
  overallConversionRate: number,
  avgHoursToContact: number,
  avgCallsToConvert: number
): string[] {
  const recommendations: string[] = [];
  
  // Priority recommendations based on bottlenecks
  const highSeverityBottlenecks = bottlenecks.filter(b => b.severity === 'high');
  if (highSeverityBottlenecks.length > 0) {
    recommendations.push(`🚨 ${highSeverityBottlenecks.length} kritik darboğaz tespit edildi. Öncelikli olarak bunları çözün.`);
  }
  
  // Response time optimization
  if (avgHoursToContact > 24) {
    recommendations.push('⚡ İlk yanıt süresini 24 saat altına düşürün. Hızlı yanıt conversion oranını önemli ölçüde artırır.');
  } else if (avgHoursToContact > 2) {
    recommendations.push('💡 İlk yanıt süresini 2 saat altına düşürmeyi hedefleyin. Lead "sıcaklığını" kaybetmeden iletişim kurun.');
  }
  
  // Call optimization
  if (avgCallsToConvert > 8) {
    recommendations.push('📞 Ortalama arama sayısı çok yüksek. Lead nitelendirme ve satış pitch\'ini optimize edin.');
  }
  
  // Overall conversion rate
  if (overallConversionRate < 5) {
    recommendations.push('🎯 Genel conversion oranı %5\'in altında. Lead kalitesini ve satış sürecini baştan sona gözden geçirin.');
  } else if (overallConversionRate < 10) {
    recommendations.push('📊 Conversion oranı ortalama. %10+ hedeflemek için süreç optimizasyonu yapın.');
  } else if (overallConversionRate > 15) {
    recommendations.push('✅ Mükemmel conversion oranı! Mevcut best practice\'leri dokümante edin ve koruyun.');
  }
  
  // Stage-specific recommendations
  const contactedBottleneck = bottlenecks.find(b => b.stage === 'New → Contacted');
  if (contactedBottleneck) {
    recommendations.push('📲 Lead routing ve otomatik görevlendirme sistemi kurun. Hiçbir lead\'in atlanmadığından emin olun.');
  }
  
  const qualifiedBottleneck = bottlenecks.find(b => b.stage === 'Contacted → Qualified');
  if (qualifiedBottleneck) {
    recommendations.push('🔍 Lead nitelendirme kriterlerinizi gözden geçirin. Satış ekibine nitelendirme eğitimi verin.');
  }
  
  const convertedBottleneck = bottlenecks.find(b => b.stage === 'Qualified → Converted');
  if (convertedBottleneck) {
    recommendations.push('💰 Satış kapatma tekniklerini güçlendirin. Qualified lead\'lerin neden kaybedildiğini analiz edin.');
  }
  
  return recommendations;
}

/**
 * Funnel sağlık skoru hesapla (0-100)
 */
function calculateFunnelHealthScore(
  conversionRate: number,
  avgResponseHours: number,
  highSeverityBottlenecks: number
): { score: number, grade: string, status: string } {
  let score = 0;
  
  // Conversion rate (40 puan)
  score += Math.min(conversionRate * 2, 40);
  
  // Response time (30 puan)
  if (avgResponseHours <= 2) score += 30;
  else if (avgResponseHours <= 6) score += 20;
  else if (avgResponseHours <= 24) score += 10;
  else if (avgResponseHours <= 48) score += 5;
  
  // Bottleneck penalty (30 puan - çıkarma)
  const bottleneckPenalty = highSeverityBottlenecks * 10;
  score += Math.max(30 - bottleneckPenalty, 0);
  
  // Grade assignment
  let grade: string;
  let status: string;
  
  if (score >= 85) {
    grade = 'A+';
    status = 'Excellent';
  } else if (score >= 75) {
    grade = 'A';
    status = 'Very Good';
  } else if (score >= 65) {
    grade = 'B';
    status = 'Good';
  } else if (score >= 55) {
    grade = 'C';
    status = 'Average';
  } else if (score >= 40) {
    grade = 'D';
    status = 'Below Average';
  } else {
    grade = 'F';
    status = 'Poor';
  }
  
  return {
    score: Math.round(score),
    grade,
    status,
  };
}
