/**
 * Bot Detection API - Get Bot Statistics
 * 
 * GET /api/traffic/bots/stats
 */

import { NextResponse } from 'next/server';
import { getBotStats } from '@/lib/traffic/bot-helpers';

export async function GET() {
  try {
    const stats = await getBotStats();

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error: any) {
    console.error('Error in GET /api/traffic/bots/stats:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch bot statistics',
      message: error.message
    }, { status: 500 });
  }
}
