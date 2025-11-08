import { NextRequest, NextResponse } from 'next/server';
import { getConversionFunnel } from '@/lib/traffic/analytics-helpers';

/**
 * GET /api/traffic/analytics/conversion
 * Get conversion funnel (visitor → form → valid → whitelisted)
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

    const conversionData = await getConversionFunnel({ days });

    return NextResponse.json({
      success: true,
      data: conversionData
    });
  } catch (error: any) {
    console.error('Error fetching conversion funnel:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch conversion funnel',
      message: error.message
    }, { status: 500 });
  }
}
