import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import db from '@/lib/db';

/**
 * POST /api/analytics/custom-report
 * 
 * Özel rapor oluşturma ve kaydetme:
 * - Kullanıcı tanımlı metrikler ve filtreler
 * - Dinamik SQL sorgu oluşturma
 * - Rapor şablonlarını kaydetme
 * - Zamanlanmış rapor desteği
 * - Multi-dimensional analysis
 * 
 * Request Body:
 * {
 *   "report_name": "string",
 *   "report_type": "leads|networks|campaigns|revenue|custom",
 *   "metrics": ["metric1", "metric2"],
 *   "dimensions": ["dimension1", "dimension2"],
 *   "filters": { ... },
 *   "date_range": { ... },
 *   "group_by": "day|week|month",
 *   "sort_by": "metric_name",
 *   "order": "asc|desc",
 *   "limit": number,
 *   "save_template": boolean
 * }
 */

const customReportSchema = z.object({
  report_name: z.string().min(1, 'Report name is required'),
  report_type: z.enum(['leads', 'networks', 'campaigns', 'revenue', 'custom']),
  
  // Metrics to include
  metrics: z.array(z.enum([
    'lead_count',
    'conversion_count',
    'conversion_rate',
    'revenue',
    'costs',
    'profit',
    'roi',
    'avg_response_time',
    'avg_calls',
    'avg_days_to_convert',
    'quality_score',
  ])).min(1, 'At least one metric required'),
  
  // Dimensions to group by
  dimensions: z.array(z.enum([
    'date',
    'network',
    'site',
    'campaign',
    'status',
    'campaign_type',
    'source',
  ])).optional().default([]),
  
  // Filters
  filters: z.object({
    date_range: z.enum(['today', 'week', 'month', 'quarter', 'year', 'custom']).optional().default('month'),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    network_ids: z.array(z.number()).optional(),
    site_ids: z.array(z.number()).optional(),
    campaign_ids: z.array(z.number()).optional(),
    statuses: z.array(z.enum(['new', 'contacted', 'qualified', 'converted', 'rejected'])).optional(),
    min_conversion_rate: z.number().optional(),
    max_cost_per_lead: z.number().optional(),
  }).optional().default(() => ({ date_range: 'month' as const })),
  
  // Grouping and sorting
  group_by: z.enum(['day', 'week', 'month']).optional().default('day'),
  sort_by: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  limit: z.number().min(1).max(1000).optional().default(100),
  
  // Save as template
  save_template: z.boolean().optional().default(false),
  avg_conversion_value: z.number().optional().default(500),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const reportConfig = customReportSchema.parse(body);

    // Date range hesaplama
    let startDate: Date;
    let endDate = new Date();
    
    const filters = reportConfig.filters;
    switch (filters.date_range) {
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
        if (!filters.start_date || !filters.end_date) {
          return NextResponse.json(
            { success: false, error: 'start_date and end_date required for custom range' },
            { status: 400 }
          );
        }
        startDate = new Date(filters.start_date);
        endDate = new Date(filters.end_date);
        break;
      default:
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
    }

    // Build dynamic query based on report type
    let reportData: any = null;
    
    switch (reportConfig.report_type) {
      case 'leads':
        reportData = await generateLeadsReport(reportConfig, startDate, endDate);
        break;
      case 'networks':
        reportData = await generateNetworksReport(reportConfig, startDate, endDate);
        break;
      case 'campaigns':
        reportData = await generateCampaignsReport(reportConfig, startDate, endDate);
        break;
      case 'revenue':
        reportData = await generateRevenueReport(reportConfig, startDate, endDate);
        break;
      case 'custom':
        reportData = await generateCustomReport(reportConfig, startDate, endDate);
        break;
    }

    // Save template if requested
    let templateId = null;
    if (reportConfig.save_template) {
      const templateResult = await db.query(
        `INSERT INTO report_templates 
        (name, report_type, config, created_at) 
        VALUES ($1, $2, $3, NOW()) 
        RETURNING id`,
        [
          reportConfig.report_name,
          reportConfig.report_type,
          JSON.stringify(reportConfig),
        ]
      );
      templateId = templateResult.rows[0]?.id;
    }

    // Response hazırla
    const response = {
      success: true,
      data: {
        report: {
          name: reportConfig.report_name,
          type: reportConfig.report_type,
          generated_at: new Date().toISOString(),
          period: {
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
          },
          template_id: templateId,
        },
        metrics: reportConfig.metrics,
        dimensions: reportConfig.dimensions,
        data: reportData,
      },
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error: any) {
    console.error('Custom report error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid report configuration', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to generate custom report' },
      { status: 500 }
    );
  }
}

/**
 * Leads raporu oluştur
 */
async function generateLeadsReport(config: any, startDate: Date, endDate: Date) {
  const filters = config.filters;
  
  // Build WHERE clause
  let whereConditions = ['l.created_at >= $1', 'l.created_at <= $2'];
  const queryParams: any[] = [startDate, endDate];
  let paramIndex = 3;
  
  if (filters.network_ids && filters.network_ids.length > 0) {
    whereConditions.push(`l.network_id = ANY($${paramIndex})`);
    queryParams.push(filters.network_ids);
    paramIndex++;
  }
  
  if (filters.site_ids && filters.site_ids.length > 0) {
    whereConditions.push(`l.site_id = ANY($${paramIndex})`);
    queryParams.push(filters.site_ids);
    paramIndex++;
  }
  
  if (filters.campaign_ids && filters.campaign_ids.length > 0) {
    whereConditions.push(`l.campaign_id = ANY($${paramIndex})`);
    queryParams.push(filters.campaign_ids);
    paramIndex++;
  }
  
  if (filters.statuses && filters.statuses.length > 0) {
    whereConditions.push(`l.status = ANY($${paramIndex})`);
    queryParams.push(filters.statuses);
    paramIndex++;
  }
  
  const whereClause = whereConditions.join(' AND ');
  
  // Build SELECT clause based on metrics
  const metricSelects: string[] = [];
  if (config.metrics.includes('lead_count')) {
    metricSelects.push('COUNT(l.id) as lead_count');
  }
  if (config.metrics.includes('conversion_count')) {
    metricSelects.push("COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as conversion_count");
  }
  if (config.metrics.includes('conversion_rate')) {
    metricSelects.push(`CASE WHEN COUNT(l.id) > 0 THEN (COUNT(CASE WHEN l.status = 'converted' THEN 1 END)::float / COUNT(l.id) * 100) ELSE 0 END as conversion_rate`);
  }
  if (config.metrics.includes('avg_response_time')) {
    metricSelects.push(`AVG(CASE WHEN l.last_contact_at IS NOT NULL THEN EXTRACT(EPOCH FROM (l.last_contact_at - l.created_at))/3600 END) as avg_response_hours`);
  }
  if (config.metrics.includes('avg_calls')) {
    metricSelects.push('AVG(l.call_count) as avg_calls');
  }
  if (config.metrics.includes('avg_days_to_convert')) {
    metricSelects.push(`AVG(CASE WHEN l.status = 'converted' AND l.converted_at IS NOT NULL THEN EXTRACT(EPOCH FROM (l.converted_at - l.created_at))/86400 END) as avg_days_to_convert`);
  }
  
  // Build GROUP BY clause based on dimensions
  const groupBySelects: string[] = [];
  const groupByColumns: string[] = [];
  
  if (config.dimensions.includes('date')) {
    const dateGroupFormat = config.group_by === 'day' ? 'DATE(l.created_at)' :
                           config.group_by === 'week' ? "DATE_TRUNC('week', l.created_at)" :
                           "DATE_TRUNC('month', l.created_at)";
    groupBySelects.push(`${dateGroupFormat} as period`);
    groupByColumns.push('period');
  }
  
  if (config.dimensions.includes('network')) {
    groupBySelects.push('l.network_id', 'n.name as network_name');
    groupByColumns.push('l.network_id', 'n.name');
  }
  
  if (config.dimensions.includes('status')) {
    groupBySelects.push('l.status');
    groupByColumns.push('l.status');
  }
  
  const selectClause = [...groupBySelects, ...metricSelects].join(', ');
  const groupByClause = groupByColumns.length > 0 ? `GROUP BY ${groupByColumns.join(', ')}` : '';
  
  // Build ORDER BY
  const orderBy = config.sort_by || (config.metrics[0] === 'lead_count' ? 'lead_count' : config.metrics[0]);
  const orderByClause = `ORDER BY ${orderBy} ${config.order} LIMIT ${config.limit}`;
  
  // Execute query
  const query = `
    SELECT ${selectClause}
    FROM leads l
    LEFT JOIN networks n ON n.id = l.network_id
    WHERE ${whereClause}
    ${groupByClause}
    ${orderByClause}
  `;
  
  const result = await db.query(query, queryParams);
  return result.rows;
}

/**
 * Networks raporu oluştur
 */
async function generateNetworksReport(config: any, startDate: Date, endDate: Date) {
  const filters = config.filters;
  
  let whereConditions = ['l.created_at >= $1', 'l.created_at <= $2'];
  const queryParams: any[] = [startDate, endDate];
  let paramIndex = 3;
  
  if (filters.network_ids && filters.network_ids.length > 0) {
    whereConditions.push(`n.id = ANY($${paramIndex})`);
    queryParams.push(filters.network_ids);
    paramIndex++;
  }
  
  const whereClause = whereConditions.join(' AND ');
  
  const metricSelects: string[] = [
    'n.id as network_id',
    'n.name as network_name',
    'COUNT(l.id) as lead_count',
    "COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as conversions",
    'n.cost_per_lead * COUNT(l.id) as total_cost',
  ];
  
  if (config.metrics.includes('conversion_rate')) {
    metricSelects.push(`CASE WHEN COUNT(l.id) > 0 THEN (COUNT(CASE WHEN l.status = 'converted' THEN 1 END)::float / COUNT(l.id) * 100) ELSE 0 END as conversion_rate`);
  }
  
  if (config.metrics.includes('quality_score')) {
    metricSelects.push(`CASE WHEN COUNT(l.id) > 0 THEN (COUNT(CASE WHEN l.status = 'converted' THEN 1 END)::float / COUNT(l.id) * 50) ELSE 0 END as quality_score`);
  }
  
  const query = `
    SELECT ${metricSelects.join(', ')}
    FROM networks n
    LEFT JOIN leads l ON l.network_id = n.id AND ${whereClause}
    GROUP BY n.id, n.name, n.cost_per_lead
    HAVING COUNT(l.id) > 0
    ORDER BY ${config.sort_by || 'lead_count'} ${config.order}
    LIMIT ${config.limit}
  `;
  
  const result = await db.query(query, queryParams);
  return result.rows;
}

/**
 * Campaigns raporu oluştur
 */
async function generateCampaignsReport(config: any, startDate: Date, endDate: Date) {
  const filters = config.filters;
  
  let whereConditions = ['l.created_at >= $1', 'l.created_at <= $2'];
  const queryParams: any[] = [startDate, endDate];
  let paramIndex = 3;
  
  if (filters.campaign_ids && filters.campaign_ids.length > 0) {
    whereConditions.push(`c.id = ANY($${paramIndex})`);
    queryParams.push(filters.campaign_ids);
    paramIndex++;
  }
  
  const whereClause = whereConditions.join(' AND ');
  
  const metricSelects: string[] = [
    'c.id as campaign_id',
    'c.name as campaign_name',
    'c.campaign_type',
    'COUNT(l.id) as lead_count',
    "COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as conversions",
    'c.budget',
    'c.spent',
  ];
  
  if (config.metrics.includes('roi')) {
    metricSelects.push(`CASE WHEN c.spent > 0 THEN ((COUNT(CASE WHEN l.status = 'converted' THEN 1 END) * 500 - c.spent) / c.spent * 100) ELSE 0 END as roi`);
  }
  
  const query = `
    SELECT ${metricSelects.join(', ')}
    FROM campaigns c
    LEFT JOIN leads l ON l.campaign_id = c.id AND ${whereClause}
    GROUP BY c.id, c.name, c.campaign_type, c.budget, c.spent
    HAVING COUNT(l.id) > 0
    ORDER BY ${config.sort_by || 'lead_count'} ${config.order}
    LIMIT ${config.limit}
  `;
  
  const result = await db.query(query, queryParams);
  return result.rows;
}

/**
 * Revenue raporu oluştur
 */
async function generateRevenueReport(config: any, startDate: Date, endDate: Date) {
  const avgConversionValue = config.avg_conversion_value || 500;
  
  const query = `
    SELECT 
      DATE_TRUNC('${config.group_by}', l.created_at) as period,
      COUNT(l.id) as leads,
      COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as conversions,
      COUNT(CASE WHEN l.status = 'converted' THEN 1 END) * $3 as revenue,
      COALESCE(SUM(CASE WHEN l.network_id IS NOT NULL THEN n.cost_per_lead ELSE 0 END), 0) as costs,
      (COUNT(CASE WHEN l.status = 'converted' THEN 1 END) * $3) - COALESCE(SUM(CASE WHEN l.network_id IS NOT NULL THEN n.cost_per_lead ELSE 0 END), 0) as profit
    FROM leads l
    LEFT JOIN networks n ON n.id = l.network_id
    WHERE l.created_at >= $1 AND l.created_at <= $2
    GROUP BY period
    ORDER BY period ${config.order}
    LIMIT ${config.limit}
  `;
  
  const result = await db.query(query, [startDate, endDate, avgConversionValue]);
  return result.rows;
}

/**
 * Custom rapor (multi-dimensional)
 */
async function generateCustomReport(config: any, startDate: Date, endDate: Date) {
  // For custom reports, use leads as base and allow multi-dimensional grouping
  return await generateLeadsReport(config, startDate, endDate);
}
