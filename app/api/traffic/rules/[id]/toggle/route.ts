/**
 * Auto Rules API - Toggle Rule Active Status
 * 
 * POST /api/traffic/rules/[id]/toggle
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { isActive } = body;


    
    const query = `
      UPDATE auto_rules
      SET is_active = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const result = await db.query(query, [isActive, id]);

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Rule not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Rule ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: result.rows[0]
    });

  } catch (error: any) {
    console.error('Error in POST /api/traffic/rules/[id]/toggle:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to toggle rule status',
      message: error.message
    }, { status: 500 });
  }
}
