import { NextRequest, NextResponse } from 'next/server';
import { getDeviceStats } from '@/lib/traffic/analytics-helpers';

/**
 * GET /api/traffic/analytics/devices
 * Get device distribution statistics (devices, OS, browsers)
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

    const deviceStats = await getDeviceStats({ days });

    return NextResponse.json({
      success: true,
      data: deviceStats
    });
  } catch (error: any) {
    console.error('Error fetching device stats:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch device stats',
      message: error.message
    }, { status: 500 });
  }
}
