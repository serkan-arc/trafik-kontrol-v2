/**
 * IP Tracking API - Update Admin Notes
 * 
 * PUT /api/traffic/ips/:ip/notes
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ ip: string }> }
) {
  const { ip } = await params;
  
  try {
    const body = await request.json();
    const { notes } = body;

    if (!notes) {
      return NextResponse.json({
        success: false,
        error: 'Notes are required'
      }, { status: 400 });
    }

    // Update notes
    await db.query(
      `UPDATE ip_tracking 
       SET admin_notes = $1
       WHERE ip = $2`,
      [notes, ip]
    );

    return NextResponse.json({
      success: true,
      message: 'Notes updated successfully',
      data: {
        ip,
        notes
      }
    });

  } catch (error: any) {
    console.error(`Error in PUT /api/traffic/ips/${ip}/notes:`, error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update notes',
      message: error.message
    }, { status: 500 });
  }
}
