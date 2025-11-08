import { NextRequest, NextResponse } from 'next/server';
import { reportFakeBot } from '@/lib/traffic/bot-helpers';

/**
 * POST /api/traffic/bots/report-fake
 * Report a fake bot detection
 * 
 * Body: {
 *   ip: string,
 *   user_agent: string,
 *   reported_by: string,
 *   notes?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { ip, user_agent, reported_by, notes } = await request.json();
    
    // Validation
    if (!ip) {
      return NextResponse.json({
        success: false,
        error: 'ip is required'
      }, { status: 400 });
    }
    
    if (!user_agent) {
      return NextResponse.json({
        success: false,
        error: 'user_agent is required'
      }, { status: 400 });
    }
    
    if (!reported_by) {
      return NextResponse.json({
        success: false,
        error: 'reported_by is required'
      }, { status: 400 });
    }
    
    // Report the fake bot
    const result = await reportFakeBot(ip, user_agent, reported_by, notes);
    
    return NextResponse.json({
      success: true,
      message: 'Fake bot report submitted successfully',
      data: result
    });
  } catch (error: any) {
    console.error('Error reporting fake bot:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to report fake bot',
      message: error.message
    }, { status: 500 });
  }
}
