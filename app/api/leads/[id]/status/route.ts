/**
 * Lead Status Update API
 * POST /api/leads/:id/status - Update lead status
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

// Validation schema
const statusSchema = z.object({
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'rejected']),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * POST /api/leads/:id/status
 * Update lead status with activity logging
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
          message: 'Invalid lead ID',
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = statusSchema.safeParse(body);
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

    const { status, reason, notes } = validation.data;

    // Get current lead data
    const currentResult = await db.query(
      'SELECT id, name, status as old_status FROM leads WHERE id = $1',
      [id]
    );

    if (currentResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Lead not found',
        },
        { status: 404 }
      );
    }

    const lead = currentResult.rows[0];

    // Update status
    const result = await db.query(
      `UPDATE leads 
       SET status = $1,
           notes = CASE 
             WHEN $2 IS NOT NULL THEN COALESCE(notes || E'\n\n', '') || $2
             ELSE notes
           END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [status, notes, id]
    );

    // Log activity
    const statusNames: Record<string, string> = {
      new: 'Yeni',
      contacted: 'Arandı',
      qualified: 'Nitelikli',
      converted: 'Dönüştü',
      rejected: 'Reddedildi',
    };

    const activityDescription = `Status değişti: ${statusNames[lead.old_status] || lead.old_status} → ${statusNames[status] || status}${
      reason ? ` (Sebep: ${reason})` : ''
    }`;

    await db.query(
      `INSERT INTO lead_activities (
        lead_id, activity_type, description, metadata, created_at
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [
        id,
        'status_changed',
        activityDescription,
        JSON.stringify({
          old_status: lead.old_status,
          new_status: status,
          reason: reason || null,
        }),
      ]
    ).catch(err => {
      console.warn('Could not log activity:', err.message);
    });

    // If converted, record conversion timestamp
    if (status === 'converted' && lead.old_status !== 'converted') {
      await db.query(
        `UPDATE leads 
         SET converted_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [id]
      ).catch(err => {
        console.warn('Could not update converted_at:', err.message);
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Lead status updated successfully',
      lead: result.rows[0],
    });
  } catch (error) {
    console.error('Status update error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error updating lead status',
      },
      { status: 500 }
    );
  }
}
