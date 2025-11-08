import { NextRequest, NextResponse } from 'next/server';
import { exportIPList } from '@/lib/traffic/ip-helpers';

/**
 * GET /api/traffic/lists/export?type=whitelist&format=json
 * Export IP list
 * 
 * Query params:
 *   - type: whitelist | graylist | blacklist (required)
 *   - format: json | csv (default: json)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const listType = searchParams.get('type') as 'whitelist' | 'graylist' | 'blacklist';
    const format = (searchParams.get('format') || 'json') as 'json' | 'csv';
    
    // Validation
    if (!listType || !['whitelist', 'graylist', 'blacklist'].includes(listType)) {
      return NextResponse.json({
        success: false,
        error: 'type parameter is required and must be one of: whitelist, graylist, blacklist'
      }, { status: 400 });
    }
    
    if (!['json', 'csv'].includes(format)) {
      return NextResponse.json({
        success: false,
        error: 'format must be one of: json, csv'
      }, { status: 400 });
    }
    
    // Export list
    const result = await exportIPList(listType, format);
    
    if (format === 'csv') {
      // Convert to CSV string
      const csvLines = [
        result.headers!.join(','),
        ...result.data.map((row: any[]) => 
          row.map(cell => {
            const str = String(cell);
            return str.includes(',') || str.includes('"') || str.includes('\n') 
              ? `"${str.replace(/"/g, '""')}"` 
              : str;
          }).join(',')
        )
      ];
      
      const csvContent = csvLines.join('\n');
      
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${listType}_export_${Date.now()}.csv"`
        }
      });
    }
    
    // JSON format
    return NextResponse.json({
      success: true,
      data: {
        list_type: listType,
        format: 'json',
        ips: result.data,
        count: result.count,
        exported_at: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Error in export:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to export IP list',
      message: error.message
    }, { status: 500 });
  }
}
