import { NextRequest, NextResponse } from 'next/server';
import { reportSpam } from '@/lib/traffic/spam-helpers';

/**
 * POST /api/traffic/form-spam/report
 * Report a spam form submission
 * 
 * Body: {
 *   ip: string,
 *   form_name: string,
 *   submission_id?: number,
 *   reported_by?: string,
 *   notes?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ip, form_name, submission_id, reported_by, notes } = body;
    
    // Validation
    if (!ip) {
      return NextResponse.json({
        success: false,
        error: 'ip is required'
      }, { status: 400 });
    }
    
    if (!form_name) {
      return NextResponse.json({
        success: false,
        error: 'form_name is required'
      }, { status: 400 });
    }
    
    // Report spam
    const result = await reportSpam(ip, form_name, submission_id, reported_by, notes);
    
    return NextResponse.json({
      success: true,
      message: 'Spam report submitted successfully',
      data: result
    });
  } catch (error: any) {
    console.error('Error reporting spam:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to report spam',
      message: error.message
    }, { status: 500 });
  }
}
