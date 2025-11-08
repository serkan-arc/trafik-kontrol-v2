/**
 * Form Spam Detection API - List Spam Detections
 * 
 * GET /api/traffic/form-spam
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM form_submission_history WHERE is_spam = true`
    );

    const dataResult = await db.query(
      `SELECT * FROM form_submission_history
       WHERE is_spam = true
       ORDER BY submitted_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return NextResponse.json({
      success: true,
      data: dataResult.rows || [],
      meta: {
        page,
        limit,
        total: parseInt(countResult.rows[0]?.total || 0)
      }
    });

  } catch (error: any) {
    // Return empty array on error to prevent frontend crashes
    return NextResponse.json({
      success: true,
      data: [],
      meta: {
        page: 1,
        limit: 20,
        total: 0
      },
      error: 'Database connection error - returning empty dataset'
    });
  }
}
