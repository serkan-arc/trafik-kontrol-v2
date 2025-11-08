import { NextRequest, NextResponse } from 'next/server';
import { getRiskTrends } from '@/lib/traffic/analytics-helpers';

/**
 * GET /api/traffic/analytics/risk-trends
 * Get risk score trends over time
 * 
 * Query params:
 *   - days: number (default: 7)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '7');

    if (days < 1 || days > 90) {
      return NextResponse.json({
        success: false,
        error: 'days must be between 1 and 90'
      }, { status: 400 });
    }

    const riskTrends = await getRiskTrends({ days });

    return NextResponse.json({
      success: true,
      data: riskTrends
    });
  } catch (error: any) {
    console.error('Error fetching risk trends:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch risk trends',
      message: error.message
    }, { status: 500 });
  }
}
