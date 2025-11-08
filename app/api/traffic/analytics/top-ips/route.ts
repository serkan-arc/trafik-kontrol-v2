import { NextRequest, NextResponse } from 'next/server';
import { getTopIPs } from '@/lib/traffic/analytics-helpers';

/**
 * GET /api/traffic/analytics/top-ips
 * Get top IPs by various metrics
 * 
 * Query params:
 *   - metric: 'visits' | 'forms' | 'risk' | 'spam' (required)
 *   - limit: number (default: 20, max: 100)
 *   - days: number (default: 7)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const metric = searchParams.get('metric') as 'visits' | 'forms' | 'risk' | 'spam';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const days = parseInt(searchParams.get('days') || '7');

    // Validation
    const validMetrics = ['visits', 'forms', 'risk', 'spam'];
    if (!metric || !validMetrics.includes(metric)) {
      return NextResponse.json({
        success: false,
        error: `metric is required and must be one of: ${validMetrics.join(', ')}`
      }, { status: 400 });
    }

    if (days < 1 || days > 365) {
      return NextResponse.json({
        success: false,
        error: 'days must be between 1 and 365'
      }, { status: 400 });
    }

    const topIPs = await getTopIPs(metric, limit, { days });

    return NextResponse.json({
      success: true,
      data: topIPs
    });
  } catch (error: any) {
    console.error('Error fetching top IPs:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch top IPs',
      message: error.message
    }, { status: 500 });
  }
}
