/**
 * IP Management API - List All IPs
 * 
 * GET /api/traffic/ips
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const risk = searchParams.get('risk');
    const sort = searchParams.get('sort') || 'last_seen';
    const offset = (page - 1) * limit;

    let whereClause = '';
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Filter by status
    if (status && status !== 'all') {
      conditions.push(`list_status = $${paramIndex++}`);
      params.push(status);
    }

    // Filter by risk level
    if (risk && risk !== 'all') {
      if (risk === 'high') {
        conditions.push(`risk_score >= 70`);
      } else if (risk === 'medium') {
        conditions.push(`risk_score >= 40 AND risk_score < 70`);
      } else if (risk === 'low') {
        conditions.push(`risk_score < 40`);
      }
    }

    if (conditions.length > 0) {
      whereClause = `WHERE ${conditions.join(' AND ')}`;
    }

    // Determine sort order
    let orderBy = 'last_seen DESC';
    switch (sort) {
      case 'risk_score':
        orderBy = 'risk_score DESC';
        break;
      case 'total_visits':
        orderBy = 'visit_count DESC';
        break;
      case 'spam_score':
        orderBy = 'spam_score DESC';
        break;
      default:
        orderBy = 'last_seen DESC';
    }

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM ip_tracking ${whereClause}`,
      params
    );

    // Get paginated results
    const dataResult = await db.query(
      `SELECT * FROM ip_tracking
       ${whereClause}
       ORDER BY ${orderBy}
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
    console.error('Error in GET /api/traffic/ips:', error);
    
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

/**
 * POST /api/traffic/ips
 * Perform bulk actions on IPs
 */
export async function POST(request: NextRequest) {
  try {
    const { action, ips } = await request.json();

    if (!action || !ips || !Array.isArray(ips)) {
      return NextResponse.json({
        success: false,
        error: 'action and ips array are required'
      }, { status: 400 });
    }

    // Perform bulk action
    switch (action) {
      case 'whitelist':
      case 'graylist':
      case 'blacklist':
        await db.query(
          `UPDATE ip_tracking 
           SET list_status = $1, updated_at = NOW()
           WHERE ip_address = ANY($2)`,
          [action, ips]
        );
        break;
      
      case 'delete':
        await db.query(
          `DELETE FROM ip_tracking WHERE ip_address = ANY($1)`,
          [ips]
        );
        break;
      
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Bulk action ${action} completed for ${ips.length} IPs`
    });

  } catch (error: any) {
    console.error('Error in POST /api/traffic/ips:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to perform bulk action',
      message: error.message
    }, { status: 500 });
  }
}