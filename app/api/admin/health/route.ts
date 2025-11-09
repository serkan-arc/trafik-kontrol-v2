import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET /api/admin/health
 * System health check
 */

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const checks: any = {
    database: { status: 'unknown', response_time_ms: 0, error: null },
    api: { status: 'healthy', response_time_ms: 0 },
    system: { status: 'unknown', uptime_seconds: 0 },
  };

  // 1. Database health check
  try {
    // Check if database connection is available (not during build)
    if (!process.env.POSTGRES_URL && !process.env.POSTGRES_URL_NON_POOLING) {
      checks.database.status = 'unavailable';
      checks.database.error = 'Database connection not configured';
    } else {
      const dbStart = Date.now();
      await query('SELECT 1');
      checks.database.response_time_ms = Date.now() - dbStart;
      checks.database.status = checks.database.response_time_ms < 1000 ? 'healthy' : 'degraded';
    }
  } catch (error: any) {
    checks.database.status = 'unhealthy';
    checks.database.error = error.message;
  }

  // 2. Get database statistics
  let stats: any = {
    total_leads: 0,
    total_users: 0,
    total_networks: 0,
    total_campaigns: 0,
    recent_leads_24h: 0,
  };

  if (checks.database.status !== 'unhealthy' && checks.database.status !== 'unavailable') {
    try {
      const leadsCount = await query('SELECT COUNT(*) as count FROM leads');
      stats.total_leads = parseInt(leadsCount.rows[0].count);

      const usersCount = await query('SELECT COUNT(*) as count FROM users');
      stats.total_users = parseInt(usersCount.rows[0].count);

      const networksCount = await query('SELECT COUNT(*) as count FROM networks');
      stats.total_networks = parseInt(networksCount.rows[0].count);

      const campaignsCount = await query('SELECT COUNT(*) as count FROM campaigns');
      stats.total_campaigns = parseInt(campaignsCount.rows[0].count);

      const recent = await query(
        `SELECT COUNT(*) as count FROM leads WHERE created_at >= NOW() - INTERVAL '24 hours'`
      );
      stats.recent_leads_24h = parseInt(recent.rows[0].count);
    } catch (error: any) {
      console.error('Stats fetch error:', error);
    }
  }

  // 3. System info
  checks.system.status = 'healthy';
  checks.system.uptime_seconds = Math.floor(process.uptime());
  checks.system.memory_usage_mb = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  checks.system.node_version = process.version;

  // 4. API response time
  checks.api.response_time_ms = Date.now() - startTime;

  // 5. Overall health status
  const overallStatus = 
    checks.database.status === 'unhealthy' ? 'unhealthy' :
    checks.database.status === 'degraded' ? 'degraded' :
    'healthy';

  const statusCode = overallStatus === 'healthy' ? 200 : 
                     overallStatus === 'degraded' ? 200 : 503;

  return NextResponse.json(
    {
      success: overallStatus !== 'unhealthy',
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: checks,
      stats: stats,
      version: '1.0.0', // API version
    },
    { status: statusCode }
  );
}
