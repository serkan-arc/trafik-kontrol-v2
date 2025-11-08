/**
 * Bot Detection API - Get Fake Bot Detections
 * 
 * GET /api/traffic/bots/fake-detections
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFakeBots } from '@/lib/traffic/bot-helpers';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');

    const fakeBots = await getFakeBots(limit);

    return NextResponse.json({
      success: true,
      data: {
        fake_bots: fakeBots,
        total: fakeBots.length
      }
    });

  } catch (error: any) {
    console.error('Error in GET /api/traffic/bots/fake-detections:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch fake bot detections',
      message: error.message
    }, { status: 500 });
  }
}
