/**
 * Form Spam Detection API - Get Statistics
 * 
 * GET /api/traffic/form-spam/stats
 */

import { NextResponse } from 'next/server';
import { getSpamStats } from '@/lib/traffic/spam-helpers';

export async function GET() {
  try {
    const stats = await getSpamStats();

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch spam statistics',
      message: error.message
    }, { status: 500 });
  }
}
