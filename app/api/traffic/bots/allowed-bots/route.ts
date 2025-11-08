import { NextRequest, NextResponse } from 'next/server';
import { getAllowedBots, updateAllowedBots } from '@/lib/traffic/bot-helpers';

/**
 * GET /api/traffic/bots/allowed-bots
 * Get list of allowed bot configurations
 */
export async function GET() {
  try {
    const allowedBots = await getAllowedBots();
    
    return NextResponse.json({
      success: true,
      data: allowedBots,
      meta: {
        total: allowedBots.length,
        enabled: allowedBots.filter(b => b.enabled).length
      }
    });
  } catch (error: any) {
    console.error('Error fetching allowed bots:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch allowed bots',
      message: error.message
    }, { status: 500 });
  }
}

/**
 * POST /api/traffic/bots/allowed-bots
 * Update allowed bot configuration
 * 
 * Body: { bot_type: string, enabled: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const { bot_type, enabled } = await request.json();
    
    if (!bot_type) {
      return NextResponse.json({
        success: false,
        error: 'bot_type is required'
      }, { status: 400 });
    }
    
    if (typeof enabled !== 'boolean') {
      return NextResponse.json({
        success: false,
        error: 'enabled must be a boolean'
      }, { status: 400 });
    }
    
    const result = await updateAllowedBots(bot_type, enabled);
    
    return NextResponse.json({
      success: true,
      message: `Bot ${bot_type} ${enabled ? 'enabled' : 'disabled'}`,
      data: result
    });
  } catch (error: any) {
    console.error('Error updating allowed bots:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update bot configuration',
      message: error.message
    }, { status: 500 });
  }
}
