import { NextRequest, NextResponse } from 'next/server';
import { getIPFormSubmissions } from '@/lib/traffic/spam-helpers';

/**
 * GET /api/traffic/form-spam/[ip]
 * Get form submissions for a specific IP
 * 
 * Query params:
 *   - limit: number (default: 50)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ip: string }> }
) {
  const { ip  } = await params;
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const submissions = await getIPFormSubmissions(ip, limit);
    
    return NextResponse.json({
      success: true,
      data: {
        ip,
        submissions,
        count: submissions.length,
        limit
      }
    });
  } catch (error: any) {
    console.error('Error fetching IP form submissions:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch form submissions',
      message: error.message
    }, { status: 500 });
  }
}
