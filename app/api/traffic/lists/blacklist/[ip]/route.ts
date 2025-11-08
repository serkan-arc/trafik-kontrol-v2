import { NextRequest, NextResponse } from 'next/server';
import { removeIPFromList } from '@/lib/traffic/ip-helpers';

/**
 * DELETE /api/traffic/lists/blacklist/[ip]
 * Remove IP from blacklist
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ip: string }> }
) {
  const { ip } = await params;
  
  try {
    const result = await removeIPFromList(ip, 'blacklist');
    
    return NextResponse.json({
      success: true,
      message: result.message,
      data: { ip: ip, previous_status: 'blacklist', new_status: 'unknown' }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Failed to remove IP from blacklist',
      message: error.message
    }, { status: error.message.includes('not found') ? 404 : 500 });
  }
}
