/**
 * IP Tracking API - Get IPs for Manual Review
 * 
 * GET /api/traffic/ips/review-queue
 */

import { NextRequest, NextResponse } from 'next/server';
import { getIPsForReview } from '@/lib/traffic/ip-helpers';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;

    const ips = await getIPsForReview(limit);

    return NextResponse.json({
      success: true,
      data: {
        ips,
        total: ips.length
      }
    });

  } catch (error: any) {
    console.error('Error in GET /api/traffic/ips/review-queue:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch review queue',
      message: error.message
    }, { status: 500 });
  }
}
