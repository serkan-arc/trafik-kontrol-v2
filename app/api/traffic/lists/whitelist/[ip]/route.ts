import { NextRequest, NextResponse } from 'next/server';
import { removeIPFromList } from '@/lib/traffic/ip-helpers';

/**
 * DELETE /api/traffic/lists/whitelist/[ip]
 * Remove IP from whitelist
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ip: string }> }
) {
  const { ip } = await params;
  
  try {
    const result = await removeIPFromList(ip, 'whitelist');
    
    return NextResponse.json({
      success: true,
      message: result.message,
      data: { ip: ip, previous_status: 'whitelist', new_status: 'unknown' }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Failed to remove IP from whitelist',
      message: error.message
    }, { status: error.message.includes('not found') ? 404 : 500 });
  }
}
