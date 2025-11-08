/**
 * IP Management API - Perform Action on IP
 * 
 * POST /api/traffic/ips/[ip]/action
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ip: string }> }
) {
  try {
    const { ip } = await params;
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({
        success: false,
        error: 'Action is required'
      }, { status: 400 });
    }


    let query = '';
    let values: any[] = [];

    switch (action) {
      case 'whitelist':
        query = `
          UPDATE ip_tracking 
          SET list_status = 'whitelist', updated_at = NOW()
          WHERE ip = $1
          RETURNING *
        `;
        values = [ip];
        break;

      case 'graylist':
        query = `
          UPDATE ip_tracking 
          SET list_status = 'graylist', updated_at = NOW()
          WHERE ip = $1
          RETURNING *
        `;
        values = [ip];
        break;

      case 'blacklist':
        query = `
          UPDATE ip_tracking 
          SET list_status = 'blacklist', updated_at = NOW()
          WHERE ip = $1
          RETURNING *
        `;
        values = [ip];
        break;

      case 'reset_risk':
        query = `
          UPDATE ip_tracking 
          SET risk_score = 0, spam_score = 0, bot_score = 0, updated_at = NOW()
          WHERE ip = $1
          RETURNING *
        `;
        values = [ip];
        break;

      case 'block':
        query = `
          UPDATE ip_tracking 
          SET list_status = 'blacklist', is_blocked = true, updated_at = NOW()
          WHERE ip = $1
          RETURNING *
        `;
        values = [ip];
        break;

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'IP not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Action '${action}' performed successfully`,
      data: result.rows[0]
    });

  } catch (error: any) {
    console.error('Error in POST /api/traffic/ips/[ip]/action:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to perform action',
      message: error.message
    }, { status: 500 });
  }
}
