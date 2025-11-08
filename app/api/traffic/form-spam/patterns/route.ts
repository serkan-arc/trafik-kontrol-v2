import { NextRequest, NextResponse } from 'next/server';
import { getSpamPatterns } from '@/lib/traffic/spam-helpers';

/**
 * GET /api/traffic/form-spam/patterns
 * Get spam pattern analysis
 * 
 * Query params:
 *   - days: number (default: 7)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '7');
    
    // Validate days range
    if (days < 1 || days > 90) {
      return NextResponse.json({
        success: false,
        error: 'days must be between 1 and 90'
      }, { status: 400 });
    }
    
    const patterns = await getSpamPatterns(days);
    
    return NextResponse.json({
      success: true,
      data: patterns
    });
  } catch (error: any) {
    console.error('Error fetching spam patterns:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch spam patterns',
      message: error.message
    }, { status: 500 });
  }
}
