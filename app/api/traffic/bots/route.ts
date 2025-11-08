/**
 * Bot Detection API - List All Bot Detections
 * 
 * GET /api/traffic/bots
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const verified = searchParams.get('verified');
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE is_bot = true';
    const params: any[] = [];
    let paramIndex = 1;

    if (verified === 'true') {
      whereClause += ` AND dns_verified = true`;
    } else if (verified === 'false') {
      whereClause += ` AND dns_verified = false`;
    }

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM ip_user_agent_history ${whereClause}`,
      params
    );

    // Get paginated results
    const dataResult = await db.query(
      `SELECT 
        uah.*,
        it.country,
        it.list_status
       FROM ip_user_agent_history uah
       LEFT JOIN ip_tracking it ON uah.ip = it.ip
       ${whereClause}
       ORDER BY uah.last_seen DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      success: true,
      data: dataResult.rows || [],
      meta: {
        page,
        limit,
        total: parseInt(countResult.rows[0]?.total || 0),
        totalPages: Math.ceil(parseInt(countResult.rows[0]?.total || 0) / limit)
      }
    });

  } catch (error: any) {
    console.error('Error in GET /api/traffic/bots:', error);
    
    // Return empty array on error to prevent frontend crashes
    return NextResponse.json({
      success: true,
      data: [],
      meta: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
      },
      error: 'Database connection error - returning empty dataset'
    });
  }
}
