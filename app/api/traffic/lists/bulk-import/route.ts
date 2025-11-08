import { NextRequest, NextResponse } from 'next/server';
import { bulkImportIPs } from '@/lib/traffic/ip-helpers';

/**
 * POST /api/traffic/lists/bulk-import
 * Bulk import IPs to a list
 * 
 * Body: {
 *   ips: string[],
 *   list_status: 'whitelist' | 'graylist' | 'blacklist',
 *   redirect_version?: 'clean' | 'gray' | 'aggressive',
 *   notes?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ips, list_status, redirect_version = 'clean', notes } = body;
    
    // Validation
    if (!ips || !Array.isArray(ips) || ips.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'ips array is required and must not be empty'
      }, { status: 400 });
    }
    
    if (!list_status || !['whitelist', 'graylist', 'blacklist'].includes(list_status)) {
      return NextResponse.json({
        success: false,
        error: 'list_status must be one of: whitelist, graylist, blacklist'
      }, { status: 400 });
    }
    
    if (redirect_version && !['clean', 'gray', 'aggressive'].includes(redirect_version)) {
      return NextResponse.json({
        success: false,
        error: 'redirect_version must be one of: clean, gray, aggressive'
      }, { status: 400 });
    }
    
    // Bulk import
    const results = await bulkImportIPs(ips, list_status, redirect_version, 'admin', notes);
    
    return NextResponse.json({
      success: true,
      message: `Bulk import completed: ${results.successful.length} successful, ${results.failed.length} failed`,
      data: {
        successful: results.successful,
        failed: results.failed,
        stats: {
          total: ips.length,
          successful: results.successful.length,
          failed: results.failed.length
        }
      }
    });
  } catch (error: any) {
    console.error('Error in bulk import:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to bulk import IPs',
      message: error.message
    }, { status: 500 });
  }
}
