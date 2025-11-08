/**
 * Traffic Analytics API - Real-Time Traffic Data
 * 
 * GET /api/traffic/analytics/real-time?hours=24
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const hours = parseInt(searchParams.get('hours') || '24');
    
    // Get hourly aggregated data for the last N hours
    const query = `
      SELECT 
        TO_CHAR(DATE_TRUNC('hour', last_seen), 'HH24:MI') as time,
        COUNT(*) as total_visits,
        COUNT(DISTINCT ip) as unique_ips,
        SUM(CASE WHEN spam_score >= 70 THEN 1 ELSE 0 END) as spam_attempts
      FROM ip_tracking
      WHERE last_seen >= NOW() - INTERVAL '${hours} hours'
      GROUP BY DATE_TRUNC('hour', last_seen)
      ORDER BY DATE_TRUNC('hour', last_seen) ASC
    `;

    const result = await db.query(query);

    const data = result.rows.map(row => ({
      time: row.time,
      totalVisits: parseInt(row.total_visits),
      uniqueIPs: parseInt(row.unique_ips),
      spamAttempts: parseInt(row.spam_attempts)
    }));

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error: any) {
    console.error('Error in GET /api/traffic/analytics/real-time:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch real-time traffic data',
      message: error.message
    }, { status: 500 });
  }
}
