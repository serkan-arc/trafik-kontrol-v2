import { NextRequest, NextResponse } from 'next/server';
import { moveIPBetweenLists } from '@/lib/traffic/ip-helpers';

/**
 * POST /api/traffic/lists/move
 * Move IP between lists
 * 
 * Body: {
 *   ip: string,
 *   from: 'whitelist' | 'graylist' | 'blacklist' | 'unknown',
 *   to: 'whitelist' | 'graylist' | 'blacklist' | 'unknown',
 *   redirect_version?: 'clean' | 'gray' | 'aggressive',
 *   notes?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ip, from, to, redirect_version, notes } = body;
    
    // Validation
    if (!ip) {
      return NextResponse.json({
        success: false,
        error: 'ip is required'
      }, { status: 400 });
    }
    
    const validStatuses = ['whitelist', 'graylist', 'blacklist', 'unknown'];
    
    if (!from || !validStatuses.includes(from)) {
      return NextResponse.json({
        success: false,
        error: 'from must be one of: whitelist, graylist, blacklist, unknown'
      }, { status: 400 });
    }
    
    if (!to || !validStatuses.includes(to)) {
      return NextResponse.json({
        success: false,
        error: 'to must be one of: whitelist, graylist, blacklist, unknown'
      }, { status: 400 });
    }
    
    if (from === to) {
      return NextResponse.json({
        success: false,
        error: 'from and to must be different'
      }, { status: 400 });
    }
    
    if (redirect_version && !['clean', 'gray', 'aggressive'].includes(redirect_version)) {
      return NextResponse.json({
        success: false,
        error: 'redirect_version must be one of: clean, gray, aggressive'
      }, { status: 400 });
    }
    
    // Move IP
    const result = await moveIPBetweenLists(ip, from, to, redirect_version, 'admin', notes);
    
    return NextResponse.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error: any) {
    console.error('Error in move IP:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to move IP',
      message: error.message
    }, { status: error.message.includes('not found') ? 404 : 500 });
  }
}
