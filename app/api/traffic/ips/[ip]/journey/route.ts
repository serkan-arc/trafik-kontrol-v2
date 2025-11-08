/**
 * IP Tracking API - Get IP Journey (Visit History)
 * 
 * GET /api/traffic/ips/:ip/journey
 */

import { NextRequest, NextResponse } from 'next/server';
import { getIPJourney } from '@/lib/traffic/ip-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ip: string }> }
) {
  const { ip } = await params;
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;

    // Get journey data
    const journey = await getIPJourney(ip, limit);

    return NextResponse.json({
      success: true,
      data: {
        ip,
        visits: journey,
        total: journey.length
      }
    });

  } catch (error: any) {
    console.error(`Error in GET /api/traffic/ips/${ip}/journey:`, error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch IP journey',
      message: error.message
    }, { status: 500 });
  }
}
