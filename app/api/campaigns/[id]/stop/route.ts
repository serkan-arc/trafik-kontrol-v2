/**
 * Campaign Stop API
 * POST /api/campaigns/:id/stop - Stop/Pause campaign
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

// Validation schema
const stopSchema = z.object({
  action: z.enum(['pause', 'complete', 'cancel']).default('pause'),
  reason: z.string().optional(),
});

/**
 * POST /api/campaigns/:id/stop
 * Stop a campaign (pause, complete, or cancel)
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

    const body = await request.json();

    // Validate request body
    const validation = stopSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation failed',
          errors: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { action, reason } = validation.data;

    // Get campaign details
    const campaignResult = await db.query(
      'SELECT id, name, status FROM campaigns WHERE id = $1',
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

    // Check if campaign is active
    if (campaign.status !== 'active' && campaign.status !== 'paused') {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot stop campaign with status: ${campaign.status}`,
        },
        { status: 400 }
      );
    }

    // Determine new status
    let newStatus = 'paused';
    let message = 'Campaign paused successfully';

    switch (action) {
      case 'pause':
        newStatus = 'paused';
        message = 'Campaign paused successfully';
        break;
      case 'complete':
        newStatus = 'completed';
        message = 'Campaign marked as completed';
        break;
      case 'cancel':
        newStatus = 'cancelled';
        message = 'Campaign cancelled';
        break;
    }

    // Update campaign status
    const result = await db.query(
      `UPDATE campaigns 
       SET status = $1,
           end_date = CASE 
             WHEN $2 IN ('completed', 'cancelled') AND end_date IS NULL 
             THEN CURRENT_TIMESTAMP 
             ELSE end_date 
           END,
           metadata = CASE
             WHEN $3 IS NOT NULL THEN 
               COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('stop_reason', $3, 'stopped_at', CURRENT_TIMESTAMP)
             ELSE metadata
           END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [newStatus, newStatus, reason || null, id]
    );

    return NextResponse.json({
      success: true,
      message: `${message}${reason ? `: ${reason}` : ''}`,
      campaign: result.rows[0],
      action: action,
    });
  } catch (error) {
    console.error('Campaign stop error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error stopping campaign',
      },
      { status: 500 }
    );
  }
}
