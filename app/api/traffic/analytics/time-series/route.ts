import { NextRequest, NextResponse } from 'next/server';
import { getTimeSeries } from '@/lib/traffic/analytics-helpers';

/**
 * GET /api/traffic/analytics/time-series
 * Get time series data for various metrics
 * 
 * Query params:
 *   - metric: 'visits' | 'ips' | 'forms' | 'spam' | 'risk' (required)
 *   - granularity: 'hour' | 'day' (default: 'day')
 *   - days: number (default: 7)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const metric = searchParams.get('metric') as 'visits' | 'ips' | 'forms' | 'spam' | 'risk';
    const granularity = (searchParams.get('granularity') || 'day') as 'hour' | 'day';
    const days = parseInt(searchParams.get('days') || '7');

    // Validation
    const validMetrics = ['visits', 'ips', 'forms', 'spam', 'risk'];
    if (!metric || !validMetrics.includes(metric)) {
      return NextResponse.json({
        success: false,
        error: `metric is required and must be one of: ${validMetrics.join(', ')}`
      }, { status: 400 });
    }

    if (!['hour', 'day'].includes(granularity)) {
      return NextResponse.json({
        success: false,
        error: 'granularity must be either "hour" or "day"'
      }, { status: 400 });
    }

    if (days < 1 || days > 90) {
      return NextResponse.json({
        success: false,
        error: 'days must be between 1 and 90'
      }, { status: 400 });
    }

    const timeSeries = await getTimeSeries(metric, granularity, { days });

    return NextResponse.json({
      success: true,
      data: timeSeries
    });
  } catch (error: any) {
    console.error('Error fetching time series:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch time series data',
      message: error.message
    }, { status: 500 });
  }
}
