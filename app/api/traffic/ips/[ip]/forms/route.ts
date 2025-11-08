/**
 * IP Tracking API - Get Form Submissions by IP
 * 
 * GET /api/traffic/ips/:ip/forms
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ip: string }> }
) {
  const { ip } = await params;
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;

    // Get form submissions
    const result = await db.query(
      `SELECT 
        id,
        form_name,
        form_url,
        time_to_fill,
        is_spam,
        spam_score,
        spam_reasons,
        same_form_count_24h,
        submitted_at
       FROM form_submission_history
       WHERE ip = $1
       ORDER BY submitted_at DESC
       LIMIT $2`,
      [ip, limit]
    );

    return NextResponse.json({
      success: true,
      data: {
        ip,
        forms: result.rows,
        total: result.rows.length
      }
    });

  } catch (error: any) {
    console.error(`Error in GET /api/traffic/ips/${ip}/forms:`, error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch form submissions',
      message: error.message
    }, { status: 500 });
  }
}
