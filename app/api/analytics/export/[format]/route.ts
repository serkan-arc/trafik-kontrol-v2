import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import db from '@/lib/db';

/**
 * GET /api/analytics/export/:format
 * 
 * Veri export (CSV, Excel, PDF):
 * - CSV export (comma-separated values)
 * - Excel export (XLSX format) - simulated as CSV with .xlsx extension
 * - PDF export (simple text format) - simulated as structured text
 * - Supports all analytics endpoints data
 * - Custom field selection
 * - Date range filtering
 * 
 * Path Parameters:
 * - format: csv, excel, pdf
 * 
 * Query Parameters:
 * - report_type: dashboard, leads, networks, campaigns, revenue, conversion
 * - date_range: today, week, month, quarter, year, custom
 * - start_date: YYYY-MM-DD (for custom range)
 * - end_date: YYYY-MM-DD (for custom range)
 * - fields: comma-separated field names (optional)
 * - include_summary: true/false (include summary stats)
 */

const querySchema = z.object({
  report_type: z.enum(['dashboard', 'leads', 'networks', 'campaigns', 'revenue', 'conversion']).default('leads'),
  date_range: z.enum(['today', 'week', 'month', 'quarter', 'year', 'custom']).optional().default('month'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  fields: z.string().optional(),
  include_summary: z.enum(['true', 'false']).optional().default('true'),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ format: string }> }
) {
  try {
    const { format } = await context.params;
    
    // Validate format
    if (!['csv', 'excel', 'pdf'].includes(format)) {
      return NextResponse.json(
        { success: false, error: 'Invalid format. Supported: csv, excel, pdf' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = querySchema.parse({
      report_type: searchParams.get('report_type') || 'leads',
      date_range: searchParams.get('date_range') || 'month',
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      fields: searchParams.get('fields') || undefined,
      include_summary: searchParams.get('include_summary') || 'true',
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

    // Fetch data based on report type
    let data: any[] = [];
    let summary: any = null;
    
    switch (query.report_type) {
      case 'leads':
        { const result = await exportLeadsData(startDate, endDate);
        data = result.data;
        summary = result.summary; }
        break;
      case 'networks':
        { const result = await exportNetworksData(startDate, endDate);
        data = result.data;
        summary = result.summary; }
        break;
      case 'campaigns':
        { const result = await exportCampaignsData(startDate, endDate);
        data = result.data;
        summary = result.summary; }
        break;
      case 'revenue':
        { const result = await exportRevenueData(startDate, endDate);
        data = result.data;
        summary = result.summary; }
        break;
      case 'conversion':
        { const result = await exportConversionData(startDate, endDate);
        data = result.data;
        summary = result.summary; }
        break;
      case 'dashboard':
        { const result = await exportDashboardData(startDate, endDate);
        data = result.data;
        summary = result.summary; }
        break;
    }

    // Filter fields if specified
    if (query.fields) {
      const fieldsArray = query.fields.split(',').map(f => f.trim());
      data = data.map(row => {
        const filtered: any = {};
        fieldsArray.forEach(field => {
          if (row.hasOwnProperty(field)) {
            filtered[field] = row[field];
          }
        });
        return filtered;
      });
    }

    // Generate export content
    let content: string;
    let contentType: string;
    let filename: string;
    
    switch (format) {
      case 'csv':
        content = generateCSV(data, summary, query.include_summary === 'true');
        contentType = 'text/csv';
        filename = `${query.report_type}_export_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      case 'excel':
        // Excel format - using CSV structure but with .xlsx extension
        // In production, use a library like 'xlsx' or 'exceljs' for true Excel format
        content = generateCSV(data, summary, query.include_summary === 'true');
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `${query.report_type}_export_${new Date().toISOString().split('T')[0]}.xlsx`;
        break;
      case 'pdf':
        // PDF format - simple text structure
        // In production, use a library like 'pdfkit' or 'jsPDF' for true PDF format
        content = generatePDFText(data, summary, query.include_summary === 'true', query.report_type);
        contentType = 'application/pdf';
        filename = `${query.report_type}_export_${new Date().toISOString().split('T')[0]}.pdf`;
        break;
      default:
        content = generateCSV(data, summary, query.include_summary === 'true');
        contentType = 'text/csv';
        filename = `export.csv`;
    }

    // Return file download response
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error: any) {
    console.error('Export error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to export data' },
      { status: 500 }
    );
  }
}

/**
 * Export leads data
 */
async function exportLeadsData(startDate: Date, endDate: Date) {
  const result = await db.query(
    `SELECT 
      l.id,
      l.lead_code,
      l.name,
      l.phone,
      l.email,
      l.status,
      l.call_count,
      n.name as network_name,
      s.name as site_name,
      c.name as campaign_name,
      l.created_at,
      l.last_contact_at,
      l.converted_at
    FROM leads l
    LEFT JOIN networks n ON n.id = l.network_id
    LEFT JOIN sites s ON s.id = l.site_id
    LEFT JOIN campaigns c ON c.id = l.campaign_id
    WHERE l.created_at >= $1 AND l.created_at <= $2
    ORDER BY l.created_at DESC
    LIMIT 10000`,
    [startDate, endDate]
  );

  const summaryResult = await db.query(
    `SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted,
      COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
    FROM leads
    WHERE created_at >= $1 AND created_at <= $2`,
    [startDate, endDate]
  );

  return {
    data: result.rows,
    summary: summaryResult.rows[0],
  };
}

/**
 * Export networks data
 */
async function exportNetworksData(startDate: Date, endDate: Date) {
  const result = await db.query(
    `SELECT 
      n.id,
      n.name,
      n.status,
      n.cost_per_lead,
      n.contact_person,
      n.contact_email,
      COUNT(l.id) as total_leads,
      COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as conversions,
      n.cost_per_lead * COUNT(l.id) as total_cost
    FROM networks n
    LEFT JOIN leads l ON l.network_id = n.id 
      AND l.created_at >= $1 AND l.created_at <= $2
    GROUP BY n.id, n.name, n.status, n.cost_per_lead, n.contact_person, n.contact_email
    ORDER BY total_leads DESC`,
    [startDate, endDate]
  );

  const summaryResult = await db.query(
    `SELECT 
      COUNT(DISTINCT n.id) as total_networks,
      COUNT(l.id) as total_leads,
      SUM(n.cost_per_lead) as total_costs
    FROM networks n
    LEFT JOIN leads l ON l.network_id = n.id 
      AND l.created_at >= $1 AND l.created_at <= $2`,
    [startDate, endDate]
  );

  return {
    data: result.rows,
    summary: summaryResult.rows[0],
  };
}

/**
 * Export campaigns data
 */
async function exportCampaignsData(startDate: Date, endDate: Date) {
  const result = await db.query(
    `SELECT 
      c.id,
      c.name,
      c.campaign_type,
      c.status,
      c.budget,
      c.spent,
      COUNT(l.id) as total_leads,
      COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as conversions,
      c.start_date,
      c.end_date
    FROM campaigns c
    LEFT JOIN leads l ON l.campaign_id = c.id 
      AND l.created_at >= $1 AND l.created_at <= $2
    GROUP BY c.id, c.name, c.campaign_type, c.status, c.budget, c.spent, c.start_date, c.end_date
    ORDER BY total_leads DESC`,
    [startDate, endDate]
  );

  const summaryResult = await db.query(
    `SELECT 
      COUNT(DISTINCT c.id) as total_campaigns,
      SUM(c.budget) as total_budget,
      SUM(c.spent) as total_spent,
      COUNT(l.id) as total_leads
    FROM campaigns c
    LEFT JOIN leads l ON l.campaign_id = c.id 
      AND l.created_at >= $1 AND l.created_at <= $2`,
    [startDate, endDate]
  );

  return {
    data: result.rows,
    summary: summaryResult.rows[0],
  };
}

/**
 * Export revenue data
 */
async function exportRevenueData(startDate: Date, endDate: Date) {
  const avgConversionValue = 500;
  
  const result = await db.query(
    `SELECT 
      DATE(l.created_at) as date,
      COUNT(l.id) as leads,
      COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as conversions,
      COUNT(CASE WHEN l.status = 'converted' THEN 1 END) * $3 as revenue,
      COALESCE(SUM(CASE WHEN l.network_id IS NOT NULL THEN n.cost_per_lead ELSE 0 END), 0) as costs,
      (COUNT(CASE WHEN l.status = 'converted' THEN 1 END) * $3) - 
        COALESCE(SUM(CASE WHEN l.network_id IS NOT NULL THEN n.cost_per_lead ELSE 0 END), 0) as profit
    FROM leads l
    LEFT JOIN networks n ON n.id = l.network_id
    WHERE l.created_at >= $1 AND l.created_at <= $2
    GROUP BY DATE(l.created_at)
    ORDER BY date DESC`,
    [startDate, endDate, avgConversionValue]
  );

  const summaryResult = await db.query(
    `SELECT 
      COUNT(CASE WHEN status = 'converted' THEN 1 END) * $3 as total_revenue,
      COALESCE(SUM(CASE WHEN network_id IS NOT NULL THEN (SELECT cost_per_lead FROM networks WHERE id = network_id) END), 0) as total_costs
    FROM leads
    WHERE created_at >= $1 AND created_at <= $2`,
    [startDate, endDate, avgConversionValue]
  );

  return {
    data: result.rows,
    summary: summaryResult.rows[0],
  };
}

/**
 * Export conversion funnel data
 */
async function exportConversionData(startDate: Date, endDate: Date) {
  const result = await db.query(
    `SELECT 
      DATE(created_at) as date,
      COUNT(*) as total_leads,
      COUNT(CASE WHEN status IN ('contacted', 'qualified', 'converted') THEN 1 END) as contacted,
      COUNT(CASE WHEN status IN ('qualified', 'converted') THEN 1 END) as qualified,
      COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted,
      COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
    FROM leads
    WHERE created_at >= $1 AND created_at <= $2
    GROUP BY DATE(created_at)
    ORDER BY date DESC`,
    [startDate, endDate]
  );

  const summaryResult = await db.query(
    `SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted,
      CASE WHEN COUNT(*) > 0 THEN (COUNT(CASE WHEN status = 'converted' THEN 1 END)::float / COUNT(*) * 100) ELSE 0 END as conversion_rate
    FROM leads
    WHERE created_at >= $1 AND created_at <= $2`,
    [startDate, endDate]
  );

  return {
    data: result.rows,
    summary: summaryResult.rows[0],
  };
}

/**
 * Export dashboard summary data
 */
async function exportDashboardData(startDate: Date, endDate: Date) {
  const result = await db.query(
    `SELECT 
      'Leads' as category,
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted
    FROM leads
    WHERE created_at >= $1 AND created_at <= $2
    UNION ALL
    SELECT 
      'Networks' as category,
      COUNT(DISTINCT n.id) as total,
      COUNT(DISTINCT CASE WHEN n.status = 'active' THEN n.id END) as converted
    FROM networks n
    UNION ALL
    SELECT 
      'Campaigns' as category,
      COUNT(DISTINCT c.id) as total,
      COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) as converted
    FROM campaigns c`,
    [startDate, endDate]
  );

  return {
    data: result.rows,
    summary: { note: 'Dashboard summary export' },
  };
}

/**
 * Generate CSV content
 */
function generateCSV(data: any[], summary: any, includeSummary: boolean): string {
  if (data.length === 0) {
    return 'No data available';
  }

  // CSV header
  const headers = Object.keys(data[0]).join(',');
  
  // CSV rows
  const rows = data.map(row => {
    return Object.values(row).map(value => {
      // Escape commas and quotes
      const stringValue = String(value === null ? '' : value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',');
  });

  let csv = [headers, ...rows].join('\n');

  // Add summary if requested
  if (includeSummary && summary) {
    csv += '\n\n--- SUMMARY ---\n';
    csv += Object.entries(summary).map(([key, value]) => `${key},${value}`).join('\n');
  }

  return csv;
}

/**
 * Generate PDF text content (simplified)
 */
function generatePDFText(data: any[], summary: any, includeSummary: boolean, reportType: string): string {
  let content = `DTekTracking Analytics Report\n`;
  content += `Report Type: ${reportType.toUpperCase()}\n`;
  content += `Generated: ${new Date().toISOString()}\n`;
  content += `\n${'='.repeat(80)}\n\n`;

  if (data.length === 0) {
    content += 'No data available\n';
    return content;
  }

  // Table header
  const headers = Object.keys(data[0]);
  content += headers.join(' | ') + '\n';
  content += '-'.repeat(80) + '\n';

  // Table rows (limit to first 100 rows for readability)
  const displayData = data.slice(0, 100);
  displayData.forEach(row => {
    content += Object.values(row).map(v => String(v === null ? '-' : v)).join(' | ') + '\n';
  });

  if (data.length > 100) {
    content += `\n... and ${data.length - 100} more rows\n`;
  }

  // Summary section
  if (includeSummary && summary) {
    content += `\n${'='.repeat(80)}\n`;
    content += 'SUMMARY\n';
    content += `${'='.repeat(80)}\n\n`;
    Object.entries(summary).forEach(([key, value]) => {
      content += `${key}: ${value}\n`;
    });
  }

  content += `\n${'='.repeat(80)}\n`;
  content += 'End of Report\n';

  return content;
}
