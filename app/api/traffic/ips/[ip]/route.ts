/**
 * IP Tracking API - Get Single IP Details
 * 
 * GET /api/traffic/ips/:ip
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateIPTracking } from '@/lib/traffic/ip-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ip: string }> }
) {
  const { ip } = await params;
  
  try {

    // Get IP data
    const ipData = await getOrCreateIPTracking(ip);

    return NextResponse.json({
      success: true,
      data: ipData
    });

  } catch (error: any) {
    console.error(`Error in GET /api/traffic/ips/${ip}:`, error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch IP details',
      message: error.message
    }, { status: 500 });
  }
}
