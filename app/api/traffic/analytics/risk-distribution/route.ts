/**
 * Traffic Analytics API - Risk Distribution Over Time
 * 
 * GET /api/traffic/analytics/risk-distribution?days=7
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '7');
    
    // Get daily risk distribution for the last N days
    const query = `
      SELECT 
        TO_CHAR(DATE_TRUNC('day', last_seen), 'Mon DD') as date,
        SUM(CASE WHEN risk_score >= 80 THEN 1 ELSE 0 END) as critical,
        SUM(CASE WHEN risk_score >= 50 AND risk_score < 80 THEN 1 ELSE 0 END) as high,
        SUM(CASE WHEN risk_score >= 30 AND risk_score < 50 THEN 1 ELSE 0 END) as medium,
        SUM(CASE WHEN risk_score < 30 THEN 1 ELSE 0 END) as low
      FROM ip_tracking
      WHERE last_seen >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE_TRUNC('day', last_seen)
      ORDER BY DATE_TRUNC('day', last_seen) ASC
    `;

    const result = await db.query(query);

    const data = result.rows.map(row => ({
      date: row.date,
      critical: parseInt(row.critical),
      high: parseInt(row.high),
      medium: parseInt(row.medium),
      low: parseInt(row.low)
    }));

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error: any) {
    console.error('Error in GET /api/traffic/analytics/risk-distribution:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch risk distribution data',
      message: error.message
    }, { status: 500 });
  }
}
