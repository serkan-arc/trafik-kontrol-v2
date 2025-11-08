import { NextRequest, NextResponse } from 'next/server';
import { getDashboardStats } from '@/lib/traffic/analytics-helpers';

/**
 * GET /api/traffic/analytics/dashboard
 * Get dashboard overview statistics
 * 
 * Query params:
 *   - days: number (default: 7)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '7');

    if (days < 1 || days > 365) {
      return NextResponse.json({
        success: false,
        error: 'days must be between 1 and 365'
      }, { status: 400 });
    }

    const stats = await getDashboardStats({ days });

    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch dashboard stats',
      message: error.message
    }, { status: 500 });
  }
}
