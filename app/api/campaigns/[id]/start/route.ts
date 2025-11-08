/**
 * Campaign Start API
 * POST /api/campaigns/:id/start - Start campaign
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/campaigns/:id/start
 * Start a campaign (set status to active)
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Validate ID
    if (isNaN(Number(id))) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid campaign ID',
        },
        { status: 400 }
      );
    }

    // Get campaign details
    const campaignResult = await db.query(
      'SELECT id, name, status, start_date FROM campaigns WHERE id = $1',
      [id]
    );

    if (campaignResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Campaign not found',
        },
        { status: 404 }
      );
    }

    const campaign = campaignResult.rows[0];

    // Check if campaign can be started
    if (campaign.status === 'active') {
      return NextResponse.json(
        {
          success: false,
          message: 'Campaign is already active',
        },
        { status: 400 }
      );
    }

    if (campaign.status === 'completed') {
      return NextResponse.json(
        {
          success: false,
          message: 'Cannot start a completed campaign',
        },
        { status: 400 }
      );
    }

    // Start campaign
    const result = await db.query(
      `UPDATE campaigns 
       SET status = 'active',
           start_date = CASE 
             WHEN start_date IS NULL THEN CURRENT_TIMESTAMP 
             ELSE start_date 
           END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    return NextResponse.json({
      success: true,
      message: `Campaign "${campaign.name}" started successfully`,
      campaign: result.rows[0],
    });
  } catch (error) {
    console.error('Campaign start error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error starting campaign',
      },
      { status: 500 }
    );
  }
}
