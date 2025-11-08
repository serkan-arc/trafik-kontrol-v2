/**
 * IP Lists API - Blacklist Management
 * 
 * GET /api/traffic/lists/blacklist - Get all blacklist IPs
 * POST /api/traffic/lists/blacklist - Add IP to blacklist
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { updateIPStatus } from '@/lib/traffic/ip-helpers';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM ip_tracking WHERE list_status = 'blacklist'`
    );

    const dataResult = await db.query(
      `SELECT * FROM ip_tracking 
       WHERE list_status = 'blacklist'
       ORDER BY updated_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return NextResponse.json({
      success: true,
      data: {
        ips: dataResult.rows,
        meta: {
          page,
          limit,
          total: parseInt(countResult.rows[0].total)
        }
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch blacklist',
      message: error.message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ip, reason, redirect_version = 'clean', notes } = body;

    if (!ip) {
      return NextResponse.json({
        success: false,
        error: 'IP is required'
      }, { status: 400 });
    }

    await updateIPStatus(ip, 'blacklist', redirect_version, 'admin', notes || reason);

    return NextResponse.json({
      success: true,
      message: `IP ${ip} added to blacklist`,
      data: { ip, status: 'blacklist', redirect_version }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Failed to add IP to blacklist',
      message: error.message
    }, { status: 500 });
  }
}
