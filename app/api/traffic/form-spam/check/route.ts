/**
 * Form Spam Detection API - Check Form Submission
 * 
 * POST /api/traffic/form-spam/check
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkFormSpam, recordFormSubmission } from '@/lib/traffic/spam-helpers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ip, form_name, form_data, time_spent_seconds } = body;

    if (!ip || !form_name || !form_data) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: ip, form_name, form_data'
      }, { status: 400 });
    }

    // Check for spam
    const spamCheck = await checkFormSpam(
      ip,
      form_name,
      form_data,
      time_spent_seconds || 0
    );

    // Record submission
    await recordFormSubmission(ip, form_name, form_data, time_spent_seconds || 0, spamCheck);

    return NextResponse.json({
      success: true,
      data: spamCheck
    });

  } catch (error: any) {
    console.error('Error in POST /api/traffic/form-spam/check:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to check form spam',
      message: error.message
    }, { status: 500 });
  }
}
