/**
 * Bot Detection API - Verify Bot via DNS
 * 
 * GET /api/traffic/bots/:ip/verify?userAgent=...
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyBot, recordBotVerification } from '@/lib/traffic/bot-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ip: string }> }
) {
  const { ip  } = await params;
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const userAgent = searchParams.get('userAgent');

    if (!userAgent) {
      return NextResponse.json({
        success: false,
        error: 'userAgent query parameter is required'
      }, { status: 400 });
    }

    // Verify bot
    const verification = await verifyBot(ip, userAgent);

    // Record result in database
    await recordBotVerification(ip, userAgent, verification);

    return NextResponse.json({
      success: true,
      data: {
        ip,
        user_agent: userAgent,
        ...verification
      }
    });

  } catch (error: any) {
    const resolvedParams = await params;
    console.error(`Error in GET /api/traffic/bots/${resolvedParams.ip}/verify:`, error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to verify bot',
      message: error.message
    }, { status: 500 });
  }
}
