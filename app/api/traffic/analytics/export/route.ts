import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'json';
    const days = parseInt(searchParams.get('days') || '7');

    // Get analytics data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analyticsData = await db.query(`
      SELECT 
        COUNT(DISTINCT ip_address) as total_ips,
        COUNT(*) as total_visits,
        COUNT(DISTINCT CASE WHEN risk_score < 30 THEN ip_address END) as clean_ips,
        COUNT(DISTINCT CASE WHEN status = 'blacklisted' THEN ip_address END) as blacklisted_ips,
        AVG(risk_score) as avg_risk_score,
        COUNT(DISTINCT CASE WHEN bot_detection = true THEN ip_address END) * 100.0 / NULLIF(COUNT(DISTINCT ip_address), 0) as bot_percentage,
        COUNT(DISTINCT CASE WHEN spam_score > 50 THEN ip_address END) * 100.0 / NULLIF(COUNT(DISTINCT ip_address), 0) as spam_percentage
      FROM ip_tracking
      WHERE created_at >= $1
    `, [startDate.toISOString()]);

    const riskLevels = await db.query(`
      SELECT 
        COUNT(CASE WHEN risk_score BETWEEN 0 AND 30 THEN 1 END) as low_risk,
        COUNT(CASE WHEN risk_score BETWEEN 31 AND 70 THEN 1 END) as medium_risk,
        COUNT(CASE WHEN risk_score BETWEEN 71 AND 90 THEN 1 END) as high_risk,
        COUNT(CASE WHEN risk_score > 90 THEN 1 END) as critical_risk
      FROM ip_tracking
      WHERE created_at >= $1
    `, [startDate.toISOString()]);

    const geographicStats = await db.query(`
      SELECT 
        country,
        COUNT(DISTINCT ip_address) as ip_count,
        COUNT(*) as total_visits,
        AVG(risk_score) as avg_risk
      FROM ip_tracking
      WHERE created_at >= $1
      GROUP BY country
      ORDER BY total_visits DESC
      LIMIT 20
    `, [startDate.toISOString()]);

    const deviceStats = await db.query(`
      SELECT 
        device_type,
        COUNT(*) as count
      FROM ip_tracking
      WHERE created_at >= $1
      GROUP BY device_type
    `, [startDate.toISOString()]);

    const exportData = {
      export_date: new Date().toISOString(),
      period: `${days} days`,
      overview: analyticsData.rows[0] || {},
      risk_levels: riskLevels.rows[0] || {},
      geographic_distribution: geographicStats.rows,
      device_distribution: deviceStats.rows
    };

    // Format based on requested type
    if (format === 'csv') {
      // Convert to CSV
      const csvHeader = 'Metric,Value\n';
      const csvRows = [
        `Export Date,${exportData.export_date}`,
        `Period,${exportData.period}`,
        `Total IPs,${exportData.overview.total_ips || 0}`,
        `Total Visits,${exportData.overview.total_visits || 0}`,
        `Clean IPs,${exportData.overview.clean_ips || 0}`,
        `Blacklisted IPs,${exportData.overview.blacklisted_ips || 0}`,
        `Average Risk Score,${exportData.overview.avg_risk_score || 0}`,
        `Bot Percentage,${exportData.overview.bot_percentage || 0}`,
        `Spam Percentage,${exportData.overview.spam_percentage || 0}`,
        '',
        'Risk Levels',
        `Low Risk,${exportData.risk_levels.low_risk || 0}`,
        `Medium Risk,${exportData.risk_levels.medium_risk || 0}`,
        `High Risk,${exportData.risk_levels.high_risk || 0}`,
        `Critical Risk,${exportData.risk_levels.critical_risk || 0}`,
        '',
        'Top Countries',
        ...exportData.geographic_distribution.map((c: any) => 
          `${c.country},${c.total_visits} visits / ${c.ip_count} IPs`
        )
      ].join('\n');

      const csv = csvHeader + csvRows;
      
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename=traffic-analytics-${new Date().toISOString().split('T')[0]}.csv`
        }
      });
    } else if (format === 'pdf') {
      // For PDF, we'll return a simple HTML that can be converted to PDF client-side
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Traffic Analytics Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; }
            .metric { margin: 10px 0; }
            .label { font-weight: bold; color: #666; }
            .value { color: #000; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>Traffic Analytics Report</h1>
          <p>Export Date: ${exportData.export_date}</p>
          <p>Period: ${exportData.period}</p>
          
          <h2>Overview</h2>
          <div class="metric"><span class="label">Total IPs:</span> <span class="value">${exportData.overview.total_ips || 0}</span></div>
          <div class="metric"><span class="label">Total Visits:</span> <span class="value">${exportData.overview.total_visits || 0}</span></div>
          <div class="metric"><span class="label">Clean IPs:</span> <span class="value">${exportData.overview.clean_ips || 0}</span></div>
          <div class="metric"><span class="label">Blacklisted IPs:</span> <span class="value">${exportData.overview.blacklisted_ips || 0}</span></div>
          
          <h2>Risk Distribution</h2>
          <table>
            <tr><th>Risk Level</th><th>Count</th></tr>
            <tr><td>Low Risk (0-30)</td><td>${exportData.risk_levels.low_risk || 0}</td></tr>
            <tr><td>Medium Risk (31-70)</td><td>${exportData.risk_levels.medium_risk || 0}</td></tr>
            <tr><td>High Risk (71-90)</td><td>${exportData.risk_levels.high_risk || 0}</td></tr>
            <tr><td>Critical Risk (>90)</td><td>${exportData.risk_levels.critical_risk || 0}</td></tr>
          </table>
          
          <h2>Geographic Distribution</h2>
          <table>
            <tr><th>Country</th><th>IP Count</th><th>Total Visits</th></tr>
            ${exportData.geographic_distribution.map((c: any) => 
              `<tr><td>${c.country}</td><td>${c.ip_count}</td><td>${c.total_visits}</td></tr>`
            ).join('')}
          </table>
        </body>
        </html>
      `;
      
      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename=traffic-analytics-${new Date().toISOString().split('T')[0]}.html`
        }
      });
    } else {
      // Default to JSON
      return NextResponse.json(exportData, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename=traffic-analytics-${new Date().toISOString().split('T')[0]}.json`
        }
      });
    }
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export analytics data' },
      { status: 500 }
    );
  }
}